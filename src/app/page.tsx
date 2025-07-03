'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownEditor, { MarkdownEditorRef } from '@/components/MarkdownEditor';

export default function Home() {
  const [markdown, setMarkdown] = useState(`# 欢迎使用 Markdown 编辑器

这是一个功能强大的 **Markdown 编辑器**，支持实时预览和语法高亮。

## 功能特性

- **实时预览**：在编辑的同时查看渲染效果
- **语法保留**：在渲染的文本中保留 Markdown 语法
- **光标控制**：通过代码控制光标位置
- **文本操作**：在光标位置插入或删除文本
- **列表自动补全**：在列表中按回车自动添加列表项

### 列表示例

1. 有序列表项 1
2. 有序列表项 2
3. 有序列表项 3

- 无序列表项 1
- 无序列表项 2
- 无序列表项 3

### 代码示例

\`\`\`javascript
function hello() {
  console.log("Hello, Markdown!");
}
\`\`\`

> 这是一个引用块示例

试试编辑这些内容，体验实时渲染效果！`);

  const editorRef = useRef<MarkdownEditorRef>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isDevelopment] = useState(process.env.NODE_ENV === 'development');

  const handleInsertText = () => {
    if (editorRef.current) {
      editorRef.current.insertText('**插入的文本**');
    }
  };

  const handleDeleteText = () => {
    if (editorRef.current) {
      editorRef.current.deleteText(5);
    }
  };

  const handleSetCursor = () => {
    if (editorRef.current) {
      editorRef.current.setCursorPosition(0);
    }
  };

  // 监控光标位置（开发模式）
  useEffect(() => {
    if (!isDevelopment) return;

    const handleSelectionChange = () => {
      if (editorRef.current) {
        const position = editorRef.current.getCursorPosition();
        setCursorPosition(position);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    
    // 添加键盘和鼠标事件监听
    const handleEvents = () => {
      setTimeout(handleSelectionChange, 0);
    };
    
    document.addEventListener('keyup', handleEvents);
    document.addEventListener('mouseup', handleEvents);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keyup', handleEvents);
      document.removeEventListener('mouseup', handleEvents);
    };
  }, [isDevelopment]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
          Markdown 编辑器
        </h1>
        
        <div className="mb-4 flex gap-4 justify-center">
          <button
            onClick={handleInsertText}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            在光标处插入文本
          </button>
          <button
            onClick={handleDeleteText}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            删除光标前5个字符
          </button>
          <button
            onClick={handleSetCursor}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            光标移到开头
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <MarkdownEditor
            ref={editorRef}
            value={markdown}
            onChange={(value) => setMarkdown(value || '')}
            height={600}
          />
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          提示：在列表项中按回车键会自动创建新的列表项
        </div>
        
        {isDevelopment && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              调试信息（仅开发模式）
            </h3>
            <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
              <p>光标位置: {cursorPosition}</p>
              <p>内容长度: {markdown.length}</p>
              <p className="mt-2 text-gray-500">
                在 Console 中执行以下代码监控详细信息：
              </p>
              <pre className="mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-x-auto">
{`document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    console.log('Cursor:', {
      offset: range.startOffset,
      container: range.startContainer,
      text: range.startContainer.textContent
    });
  }
});`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}