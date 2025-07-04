'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownEditor, { MarkdownEditorRef } from '@/components/MarkdownEditor';

export default function Home() {
  const [markdown, setMarkdown] = useState(`# Markdown 编辑器示例

## 标题
# H1 一级标题
## H2 二级标题  
### H3 三级标题
#### H4 四级标题
##### H5 五级标题
###### H6 六级标题

## 文本样式
**粗体** __粗体__ *斜体* _斜体_  
**_粗斜体_** __*粗斜体*__ ~~删除线~~

## 列表
- 无序列表
  - 嵌套项目
    - 深层嵌套
* 使用星号
+ 使用加号

1. 有序列表
2. 第二项
   1. 子项目

- [x] 已完成任务
- [ ] 未完成任务
  - [x] 嵌套任务

## 链接和代码
[链接文本](https://github.com "标题")  
行内代码 \`code\`

\`\`\`javascript
// 代码块
const greeting = "Hello";
console.log(greeting);
\`\`\`

\`\`\`python
# Python 示例
print("Hello")
\`\`\`

\`\`\`
无语言标识代码块
\`\`\`

## 引用
> 单行引用

> 多行引用
> 继续引用

> 一级引用
>> 二级嵌套
>>> 三级嵌套

> 引用中的 **粗体** 和 \`代码\`
> - 引用中的列表

## 分隔线
---

**提示**：编辑器支持完整的 GFM 语法！`);

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