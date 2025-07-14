'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import CodeMirrorEditor, { MarkdownEditorRef } from '@/components/CodeMirrorEditor';
import DiffControls from '@/components/DiffControls';
import { useConfigStore, getDecryptedApiKey, hydrateConfigStore } from '@/stores/configStore';
import { validateLLMConfig, sendMessageToLLM } from '@/services/llm';
import { processAIResponse, applyDiffPreviews, acceptDiffChanges, rejectDiffChanges } from '@/utils/ai-response-handler';
import { DiffPreviewItem } from '@/types/diff';
import { testDiffParser } from '@/utils/test-diff-parser';
import { testContextFinding } from '@/utils/test-context-finding';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { provider } = useConfigStore();
  const [configError, setConfigError] = useState<string>('');
  const [hasDiffs, setHasDiffs] = useState(false);
  
  const [markdown, setMarkdown] = useState('');

  const editorRef = useRef<MarkdownEditorRef>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 在客户端初始化配置存储
  useEffect(() => {
    hydrateConfigStore();
  }, []);

  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 检查配置状态
  useEffect(() => {
    const validation = validateLLMConfig();
    setConfigError(validation.error || '');
  }, [provider]);
  
  // 测试 DIFF 解析器（仅开发环境）
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).testDiffParser = testDiffParser;
      (window as any).testContextFinding = testContextFinding;
      console.log('DIFF 解析器测试已加载，在控制台运行 testDiffParser() 进行测试');
      console.log('上下文查找测试已加载，在控制台运行 testContextFinding() 进行测试');
    }
  }, []);


  // 处理接受所有修改
  const handleAcceptAll = () => {
    if (!editorRef.current) return;
    
    // 接受所有修改（移除高亮标记）
    acceptDiffChanges(editorRef.current);
    
    // 更新状态
    setHasDiffs(false);
  };

  // 处理拒绝所有修改
  const handleRejectAll = () => {
    if (!editorRef.current) return;
    
    // 拒绝所有修改（恢复原始内容）
    rejectDiffChanges(editorRef.current);
    
    // 更新状态
    setHasDiffs(false);
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!prompt.trim() || isLoading || !editorRef.current) return;

    const validation = validateLLMConfig();
    if (!validation.isValid) {
      setConfigError(validation.error || 'Invalid configuration');
      return;
    }

    setIsLoading(true);
    try {
      // 获取当前编辑器内容
      const currentContent = editorRef.current.getValue();
      
      // 发送消息给 AI，使用模板变量传递内容和指令
      const result = await sendMessageToLLM(prompt, undefined, {
        content: currentContent,
        instruction: prompt,
        language: 'zh-CN'
      });
      
      if (result.success && result.content) {
        console.log('AI 原始响应:', result.content);
        
        // 处理 AI 响应
        const diffResult = processAIResponse(result.content, currentContent);
        
        if (diffResult.success && diffResult.previews.length > 0) {
          // 应用 diff 到编辑器（带高亮标记）
          applyDiffPreviews(editorRef.current, diffResult.previews, true);
          
          // 更新状态
          setHasDiffs(true);
          
          // 清空输入框
          setPrompt('');
          // 重置输入框高度
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.style.height = 'auto';
          }
        } else if (!diffResult.success) {
          console.error('DIFF 解析错误:', diffResult.error);
          console.error('AI 原始响应长度:', result.content.length);
          console.error('AI 响应前100字符:', result.content.substring(0, 100));
          alert(`处理 AI 响应时出错: ${diffResult.error}`);
        } else {
          console.log('AI 未返回任何修改');
          console.log('解析结果:', diffResult);
        }
      } else {
        console.error('Error:', result.error);
        alert(`发送消息失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('发送消息时出现错误');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 - 直接从顶部开始 */}
      <div className="w-[90%] max-w-[1280px] mx-auto pt-10 pb-24">
        <div className="min-h-[calc(100vh-10rem)]">
          <CodeMirrorEditor
            ref={editorRef}
            value={markdown}
            onChange={(value) => {
              setMarkdown(value || '');
              // 检查是否还有 diff 标记（支持组合格式）
              const hasDiffMarkers = /\[(?:\{-\}[^\{\]]+)?(?:\{\+\}[^\]]+)?\]/.test(value || '');
              setHasDiffs(hasDiffMarkers);
            }}
          />
        </div>
      </div>
      
      {/* Diff Controls */}
      <DiffControls
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
        isLoading={isLoading}
        hasDiffs={hasDiffs}
      />
      
      {/* Fixed Prompt Bar - ChatGPT Style */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="向 AI 提出修改要求..."
              className="w-full px-4 py-3 pr-16 rounded-xl resize-none focus:outline-none focus:ring-1 border bg-gray-50 text-gray-900 focus:ring-gray-300 placeholder-gray-400 border-gray-200"
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto'
              }}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            
            {/* 按钮组 - 放在输入框内部右侧 */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* 发送按钮 */}
              <button
                onClick={handleSendMessage}
                disabled={!prompt.trim() || isLoading || !!configError}
                className={`p-2 rounded-lg transition-all ${
                  !prompt.trim() || configError
                    ? 'text-gray-400 cursor-not-allowed'
                    : isLoading
                    ? 'text-gray-500 cursor-wait'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={configError || "Send message (Enter)"}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
              
              {/* 菜单按钮 */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg transition-all text-gray-500 hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {/* 下拉菜单 */}
                {showMenu && (
                  <div className="absolute bottom-full right-0 mb-2 rounded-lg shadow-lg py-1 min-w-[160px] border bg-white border-gray-200">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowMenu(false)}
                    >
                      Settings
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}