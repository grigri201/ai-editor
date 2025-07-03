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

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ value, onChange, height = 500 }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState(value);
    const [isComposing, setIsComposing] = useState(false);
    const isRenderingRef = useRef(false);

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

    // 获取光标位置（相对于纯文本）
    const getCursorOffset = (): number => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !editorRef.current) return 0;

      const range = selection.getRangeAt(0);
      const tempRange = document.createRange();
      tempRange.selectNodeContents(editorRef.current);
      tempRange.setEnd(range.startContainer, range.startOffset);
      
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(tempRange.cloneContents());
      
      // 获取所有行的纯文本
      let offset = 0;
      const lines = tempDiv.querySelectorAll('.markdown-line');
      lines.forEach((line, index) => {
        offset += (line.textContent || '').length;
        if (index < lines.length - 1) offset += 1; // 加上换行符
      });
      
      // 如果最后一个节点是文本节点，需要加上其偏移量
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const parentLine = range.startContainer.parentElement?.closest('.markdown-line');
        if (parentLine && !tempDiv.contains(parentLine)) {
          const lineText = parentLine.textContent || '';
          const nodeText = range.startContainer.textContent || '';
          const nodeOffset = lineText.indexOf(nodeText);
          offset += nodeOffset + range.startOffset;
        }
      }
      
      return offset;
    };

    // 设置光标位置
    const setCursorOffset = (offset: number) => {
      if (!editorRef.current) return;

      const lines = editorRef.current.querySelectorAll('.markdown-line');
      let currentOffset = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLength = (line.textContent || '').length;
        
        if (currentOffset + lineLength >= offset || i === lines.length - 1) {
          // 在这一行设置光标
          const localOffset = Math.min(offset - currentOffset, lineLength);
          const textNode = findTextNode(line, localOffset);
          
          if (textNode) {
            const range = document.createRange();
            const selection = window.getSelection();
            
            range.setStart(textNode.node, textNode.offset);
            range.collapse(true);
            
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
          break;
        }
        
        currentOffset += lineLength + 1; // 加上换行符
      }
    };

    // 查找文本节点和偏移量
    const findTextNode = (element: Element, offset: number): { node: Node; offset: number } | null => {
      let currentOffset = 0;
      
      const walk = (node: Node): { node: Node; offset: number } | null => {
        if (node.nodeType === Node.TEXT_NODE) {
          const length = node.textContent?.length || 0;
          if (currentOffset + length >= offset) {
            return { node, offset: offset - currentOffset };
          }
          currentOffset += length;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          for (const child of node.childNodes) {
            const result = walk(child);
            if (result) return result;
          }
        }
        return null;
      };
      
      return walk(element);
    };

    // 渲染 Markdown 内容，保留语法
    const renderContent = (text: string) => {
      if (!editorRef.current || isRenderingRef.current) return;
      
      isRenderingRef.current = true;
      
      // 保存光标位置
      const cursorOffset = getCursorOffset();
      
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
          processedLine = `<span class="markdown-syntax">${headingMatch[1]}</span> <span class="markdown-h${level}">${headingMatch[2]}</span>`;
        }
        
        // 粗体处理
        processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>');
        processedLine = processedLine.replace(/__([^_]+)__/g, '<span class="markdown-syntax">__</span><strong>$1</strong><span class="markdown-syntax">__</span>');
        
        // 斜体处理
        processedLine = processedLine.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>');
        processedLine = processedLine.replace(/(?<!_)_([^_]+)_(?!_)/g, '<span class="markdown-syntax">_</span><em>$1</em><span class="markdown-syntax">_</span>');
        
        // 行内代码处理
        processedLine = processedLine.replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
        
        // 列表项处理
        const unorderedListMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
        if (unorderedListMatch) {
          const [, indent, marker, content] = unorderedListMatch;
          const processedContent = content
            .replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>')
            .replace(/\*([^*]+)\*/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>')
            .replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
          processedLine = `${indent}<span class="markdown-syntax">${marker}</span> <span class="markdown-list-content">${processedContent}</span>`;
        }
        
        const orderedListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (orderedListMatch) {
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
      
      // 恢复光标位置
      setTimeout(() => {
        setCursorOffset(cursorOffset);
        isRenderingRef.current = false;
      }, 0);
    };

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
      
      // 延迟渲染，避免输入时的闪烁
      setTimeout(() => {
        if (!isComposing && !isRenderingRef.current) {
          renderContent(plainText);
        }
      }, 50);
    }, [isComposing]);

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
        
        // 插入新行
        document.execCommand('insertHTML', false, newLineContent);
        
        // 触发输入事件更新内容
        setTimeout(() => {
          handleInput();
        }, 0);
      }
    }, [handleInput]);

    // 处理粘贴事件
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }, []);

    // 处理组合输入结束
    const handleCompositionEnd = useCallback(() => {
      setIsComposing(false);
      // 组合输入结束后立即更新
      setTimeout(() => {
        handleInput();
      }, 0);
    }, [handleInput]);

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        if (!editorRef.current) return;
        
        editorRef.current.focus();
        document.execCommand('insertText', false, text);
        handleInput();
      },
      deleteText: (length: number) => {
        if (!editorRef.current) return;
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.setStart(range.startContainer, Math.max(0, range.startOffset - length));
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('delete', false);
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