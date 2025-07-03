'use client';

import React, { useRef, useImperativeHandle, forwardRef, useCallback, KeyboardEvent, useEffect, useState } from 'react';

export interface MarkdownEditorRef {
  insertText: (text: string) => void;
  deleteText: (length: number) => void;
  getCursorPosition: () => number;
  setCursorPosition: (position: number) => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value?: string) => void;
  height?: number;
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ value, onChange, height = 500 }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState(value);
    const [isComposing, setIsComposing] = useState(false);
    const isRenderingRef = useRef(false);
    const lastCursorPositionRef = useRef(0);

    // 更新内容时同步到父组件
    useEffect(() => {
      onChange(content);
    }, [content, onChange]);

    // 初始化时渲染内容
    useEffect(() => {
      if (editorRef.current && value) {
        renderContent(value);
      }
    }, []);

    // 当外部 value 改变时更新内容
    useEffect(() => {
      if (value !== content && editorRef.current) {
        renderContent(value);
        setContent(value);
      }
    }, [value]);

    // 获取光标位置（相对于纯文本）- 简化版本
    const getCursorOffset = (): number => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !editorRef.current) return 0;

      const range = selection.getRangeAt(0);
      let offset = 0;
      let node = editorRef.current.firstChild;
      let foundStart = false;

      // 遍历所有行
      while (node && !foundStart) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('markdown-line')) {
          const lineElement = node as HTMLElement;
          
          // 检查光标是否在这一行
          if (lineElement.contains(range.startContainer)) {
            // 计算在这一行内的偏移量
            const lineText = lineElement.textContent || '';
            
            // 如果是文本节点
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
              const textContent = range.startContainer.textContent || '';
              const beforeText = lineElement.textContent?.substring(0, lineElement.textContent.indexOf(textContent) + range.startOffset) || '';
              offset += beforeText.length;
            } else {
              // 如果是元素节点，获取到开始位置的文本长度
              offset += lineText.length;
            }
            foundStart = true;
          } else {
            // 添加整行的长度 + 换行符
            offset += (lineElement.textContent || '').length + 1;
          }
        }
        node = node.nextSibling;
      }

      // 如果是最后一行，需要减去多余的换行符
      const lines = editorRef.current.querySelectorAll('.markdown-line');
      if (lines.length > 0 && range.startContainer === lines[lines.length - 1] || 
          (lines[lines.length - 1] as HTMLElement).contains(range.startContainer)) {
        offset = Math.max(0, offset - 1);
      }

      console.log('Cursor offset:', offset);
      return offset;
    };

    // 设置光标位置 - 简化版本
    const setCursorOffset = (offset: number) => {
      if (!editorRef.current) return;

      let currentOffset = 0;
      const lines = editorRef.current.querySelectorAll('.markdown-line');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] as HTMLElement;
        const lineText = line.textContent || '';
        const lineLength = lineText.length;
        const isLastLine = i === lines.length - 1;
        
        // 计算这一行结束时的偏移量（包括换行符）
        const lineEndOffset = currentOffset + lineLength + (isLastLine ? 0 : 1);
        
        if (offset <= lineEndOffset || isLastLine) {
          // 光标应该在这一行
          const localOffset = Math.min(offset - currentOffset, lineLength);
          
          // 在这一行中找到正确的文本节点
          const walker = document.createTreeWalker(
            line,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node: Node | null;
          let nodeOffset = 0;
          
          while (node = walker.nextNode()) {
            const nodeLength = node.textContent?.length || 0;
            if (nodeOffset + nodeLength >= localOffset) {
              // 在这个文本节点中设置光标
              const range = document.createRange();
              const selection = window.getSelection();
              
              range.setStart(node, localOffset - nodeOffset);
              range.collapse(true);
              
              selection?.removeAllRanges();
              selection?.addRange(range);
              
              console.log('Set cursor at offset:', offset, 'in line:', i, 'local offset:', localOffset);
              return;
            }
            nodeOffset += nodeLength;
          }
          
          // 如果没找到文本节点，将光标设置在行末
          const range = document.createRange();
          const selection = window.getSelection();
          
          range.selectNodeContents(line);
          range.collapse(false);
          
          selection?.removeAllRanges();
          selection?.addRange(range);
          return;
        }
        
        currentOffset = lineEndOffset;
      }
    };

    // 渲染 Markdown 内容，保留语法
    const renderContent = useCallback((text: string) => {
      if (!editorRef.current || isRenderingRef.current) return;
      
      isRenderingRef.current = true;
      
      // 保存光标位置
      const cursorOffset = getCursorOffset();
      lastCursorPositionRef.current = cursorOffset;
      
      const lines = text.split('\n');
      const html = lines.map((line, lineIndex) => {
        let processedLine = line;
        
        // 转义 HTML
        processedLine = processedLine
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        
        // 标题处理
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingContent = headingMatch[2]
            .replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>')
            .replace(/\*([^*]+)\*/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>')
            .replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
          processedLine = `<span class="markdown-syntax">${headingMatch[1]}</span> <span class="markdown-h${level}">${headingContent}</span>`;
        } else {
          // 非标题行的处理
          // 粗体处理
          processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>');
          processedLine = processedLine.replace(/__([^_]+)__/g, '<span class="markdown-syntax">__</span><strong>$1</strong><span class="markdown-syntax">__</span>');
          
          // 斜体处理
          processedLine = processedLine.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>');
          processedLine = processedLine.replace(/(?<!_)_([^_]+)_(?!_)/g, '<span class="markdown-syntax">_</span><em>$1</em><span class="markdown-syntax">_</span>');
          
          // 行内代码处理
          processedLine = processedLine.replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
        }
        
        // 列表项处理
        const unorderedListMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
        if (unorderedListMatch && !headingMatch) {
          const [, indent, marker, content] = unorderedListMatch;
          const processedContent = content
            .replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>')
            .replace(/\*([^*]+)\*/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>')
            .replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
          processedLine = `${indent}<span class="markdown-syntax">${marker}</span> <span class="markdown-list-content">${processedContent}</span>`;
        }
        
        const orderedListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (orderedListMatch && !headingMatch) {
          const [, indent, number, content] = orderedListMatch;
          const processedContent = content
            .replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>')
            .replace(/\*([^*]+)\*/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>')
            .replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
          processedLine = `${indent}<span class="markdown-syntax">${number}.</span> <span class="markdown-list-content">${processedContent}</span>`;
        }
        
        return `<div class="markdown-line" data-line="${lineIndex}">${processedLine || '&nbsp;'}</div>`;
      }).join('');
      
      editorRef.current.innerHTML = html;
      
      // 使用 requestAnimationFrame 恢复光标位置
      requestAnimationFrame(() => {
        setCursorOffset(cursorOffset);
        isRenderingRef.current = false;
      });
    }, []);

    // 防抖的渲染函数
    const debouncedRender = useCallback(
      debounce((text: string) => {
        renderContent(text);
      }, 100),
      [renderContent]
    );

    // 获取纯文本内容
    const getPlainText = (element: HTMLElement): string => {
      const lines: string[] = [];
      const children = element.querySelectorAll('.markdown-line');
      
      children.forEach((child) => {
        const text = child.textContent || '';
        lines.push(text === '\u00A0' ? '' : text); // 将 &nbsp; 转换回空字符串
      });
      
      return lines.join('\n');
    };

    // 处理输入事件
    const handleInput = useCallback(() => {
      if (!editorRef.current || isComposing || isRenderingRef.current) return;
      
      const plainText = getPlainText(editorRef.current);
      setContent(plainText);
      
      // 使用防抖渲染
      debouncedRender(plainText);
    }, [isComposing, debouncedRender]);

    // 处理键盘事件
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const currentLine = range.startContainer.parentElement?.closest('.markdown-line');
        if (!currentLine) return;
        
        const lineText = currentLine.textContent || '';
        
        // 检查是否是列表项
        const unorderedMatch = lineText.match(/^(\s*)([-*+])\s/);
        const orderedMatch = lineText.match(/^(\s*)(\d+)\.\s/);
        
        let newLineContent = '\n';
        
        if (unorderedMatch) {
          const [, indent, marker] = unorderedMatch;
          const restOfLine = lineText.substring(unorderedMatch[0].length);
          
          if (restOfLine.trim() === '') {
            // 空列表项，移除列表标记
            newLineContent = '\n';
          } else {
            // 创建新列表项
            newLineContent = `\n${indent}${marker} `;
          }
        } else if (orderedMatch) {
          const [, indent, number] = orderedMatch;
          const restOfLine = lineText.substring(orderedMatch[0].length);
          
          if (restOfLine.trim() === '') {
            // 空列表项，移除列表标记
            newLineContent = '\n';
          } else {
            // 创建新列表项，数字递增
            const nextNumber = parseInt(number) + 1;
            newLineContent = `\n${indent}${nextNumber}. `;
          }
        }
        
        // 使用现代 API 插入文本
        const textNode = document.createTextNode(newLineContent);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 触发输入事件更新内容
        handleInput();
      }
    }, [handleInput]);

    // 处理粘贴事件
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }, [handleInput]);

    // 处理组合输入结束
    const handleCompositionEnd = useCallback(() => {
      setIsComposing(false);
      // 组合输入结束后立即更新
      requestAnimationFrame(() => {
        handleInput();
      });
    }, [handleInput]);

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        if (!editorRef.current) return;
        
        editorRef.current.focus();
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        handleInput();
      },
      deleteText: (length: number) => {
        if (!editorRef.current) return;
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        // 计算要删除的范围
        let deleteOffset = startOffset;
        let deleteContainer = startContainer;
        
        for (let i = 0; i < length && deleteOffset > 0; i++) {
          deleteOffset--;
        }
        
        range.setStart(deleteContainer, deleteOffset);
        range.deleteContents();
        
        handleInput();
      },
      getCursorPosition: () => {
        return getCursorOffset();
      },
      setCursorPosition: (position: number) => {
        if (!editorRef.current) return;
        setCursorOffset(position);
        editorRef.current.focus();
      }
    }));

    return (
      <div className="markdown-editor-wrapper" style={{ height }}>
        <div
          ref={editorRef}
          contentEditable
          className="markdown-editor-content"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={handleCompositionEnd}
          suppressContentEditableWarning
        />
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;