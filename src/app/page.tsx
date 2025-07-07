'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import MarkdownEditor, { MarkdownEditorRef } from '@/components/MarkdownEditor';
import { useConfigStore, getDecryptedApiKey } from '@/stores/configStore';
import { validateLLMConfig, sendMessageToLLM } from '@/services/llm';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { provider, theme } = useConfigStore();
  const [configError, setConfigError] = useState<string>('');
  
  const [markdown, setMarkdown] = useState('');

  const editorRef = useRef<MarkdownEditorRef>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!prompt.trim() || isLoading) return;

    const validation = validateLLMConfig();
    if (!validation.isValid) {
      setConfigError(validation.error || 'Invalid configuration');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendMessageToLLM(prompt);
      if (result.success && result.content) {
        // 暂时只在控制台显示结果
        console.log('AI Response:', result.content);
        // 清空输入框
        setPrompt('');
        // 重置输入框高度
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = 'auto';
        }
        // TODO: 处理 AI 响应
      } else {
        console.error('Error:', result.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* 主内容区域 - 直接从顶部开始 */}
      <div className="w-[90%] max-w-[1280px] mx-auto pt-10 pb-24">
        <div className="min-h-[calc(100vh-10rem)]">
          <MarkdownEditor
            ref={editorRef}
            value={markdown}
            onChange={(value) => setMarkdown(value || '')}
          />
        </div>
      </div>
      
      {/* Fixed Prompt Bar - ChatGPT Style */}
      <div className={`fixed bottom-0 left-0 right-0 border-t ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
              placeholder="Send message..."
              className={`w-full px-4 py-3 pr-16 rounded-xl resize-none focus:outline-none focus:ring-1 border ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-gray-100 focus:ring-gray-600 placeholder-gray-400 border-gray-600' 
                  : 'bg-gray-50 text-gray-900 focus:ring-gray-300 placeholder-gray-400 border-gray-200'
              }`}
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
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-600'
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
                  className={`p-2 rounded-lg transition-all ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {/* 下拉菜单 */}
                {showMenu && (
                  <div className={`absolute bottom-full right-0 mb-2 rounded-lg shadow-lg py-1 min-w-[160px] ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'
                  }`}>
                    <Link
                      href="/settings"
                      className={`block px-4 py-2 text-sm transition-colors ${
                        theme === 'dark'
                          ? 'text-gray-200 hover:bg-gray-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
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