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

    // 当内容改变时通知父组件
    const notifyChange = useCallback((newContent: string) => {
      setContent(newContent);
      onChange(newContent);
    }, [onChange]);

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
        notifyChange(value);
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

    // 设置光标位置
    const setCursorOffset = (offset: number) => {
      if (!editorRef.current) return;
      
      // 确保编辑器有焦点
      editorRef.current.focus();
      
      const lines = editorRef.current.querySelectorAll('.markdown-line');
      let currentOffset = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] as HTMLElement;
        const lineText = line.textContent || '';
        const lineLength = lineText.length;
        const isLastLine = i === lines.length - 1;
        
        // 这一行的结束位置（包括换行符）
        const lineEndWithNewline = currentOffset + lineLength + (isLastLine ? 0 : 1);
        
        // 检查光标是否在这一行范围内
        if (offset >= currentOffset && offset <= currentOffset + lineLength) {
          // 光标在这一行内
          const localOffset = offset - currentOffset;
          setCursorInLine(line, localOffset, i, offset);
          return;
        } else if (!isLastLine && offset === lineEndWithNewline) {
          // 光标正好在换行符后（下一行开头）
          currentOffset = lineEndWithNewline;
          continue;
        }
        
        currentOffset = lineEndWithNewline;
      }
    };
    
    // 辅助函数：在特定行内设置光标
    const setCursorInLine = useCallback((line: HTMLElement, localOffset: number, lineIndex: number, totalOffset: number) => {
      const selection = window.getSelection();
      if (!selection) return;
      
      // 清除现有选择
      selection.removeAllRanges();
      
      // 处理空行
      if (line.innerHTML === '<br>') {
        const range = document.createRange();
        const br = line.querySelector('br');
        if (br) {
          range.setStartBefore(br);
          range.collapse(true);
          selection.addRange(range);
          console.log('Set cursor at offset:', totalOffset, 'in empty line:', lineIndex);
        }
        return;
      }
      
      // 遍历文本节点找到正确位置
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
          const range = document.createRange();
          // 确保偏移量不会为负或超出范围
          const positionInNode = localOffset - nodeOffset;
          const safeOffset = Math.max(0, Math.min(positionInNode, nodeLength));
          
          try {
            range.setStart(node, safeOffset);
            range.collapse(true);
            selection.addRange(range);
            console.log('Set cursor at offset:', totalOffset, 'in line:', lineIndex, 'local offset:', localOffset);
          } catch (e) {
            console.error('Error setting cursor position:', e);
            // 如果出错，尝试设置在行末
            range.selectNodeContents(line);
            range.collapse(false);
            selection.addRange(range);
          }
          return;
        }
        nodeOffset += nodeLength;
      }
      
      // 如果没找到合适的文本节点，设置在行末
      const range = document.createRange();
      range.selectNodeContents(line);
      range.collapse(false);
      selection.addRange(range);
    }, []);

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
        
        return `<div class="markdown-line" data-line="${lineIndex}">${processedLine || '<br>'}</div>`;
      }).join('');
      
      editorRef.current.innerHTML = html;
      
      // 使用 requestAnimationFrame 恢复光标位置
      requestAnimationFrame(() => {
        setCursorOffset(cursorOffset);
        isRenderingRef.current = false;
      });
    }, [setCursorInLine]);

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
        // 检查是否只包含 <br> 标签
        if (child.innerHTML === '<br>') {
          lines.push('');
        } else {
          const text = child.textContent || '';
          lines.push(text);
        }
      });
      
      return lines.join('\n');
    };

    // 处理输入事件
    const handleInput = useCallback(() => {
      if (!editorRef.current || isComposing || isRenderingRef.current) return;
      
      const plainText = getPlainText(editorRef.current);
      notifyChange(plainText);
      
      // 使用防抖渲染
      debouncedRender(plainText);
    }, [isComposing, debouncedRender, notifyChange]);

    // 检查光标是否在行首
    const isCursorAtLineStart = (range: Range, line: Element): boolean => {
      const lineText = line.textContent || '';
      if (lineText === '' || lineText === '\u00A0') return true;
      
      // 创建一个范围从行开始到光标位置
      const testRange = document.createRange();
      testRange.selectNodeContents(line);
      testRange.setEnd(range.startContainer, range.startOffset);
      
      const beforeCursor = testRange.toString();
      return beforeCursor === '';
    };

    // 检查光标是否在行尾
    const isCursorAtLineEnd = (range: Range, line: Element): boolean => {
      const lineText = line.textContent || '';
      if (lineText === '' || lineText === '\u00A0') return true;
      
      // 创建一个范围从光标位置到行结束
      const testRange = document.createRange();
      testRange.setStart(range.endContainer, range.endOffset);
      testRange.selectNodeContents(line);
      testRange.setStart(range.endContainer, range.endOffset);
      
      const afterCursor = testRange.toString();
      return afterCursor === '';
    };

    // 处理键盘事件
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const currentLine = range.startContainer.parentElement?.closest('.markdown-line');
      if (!currentLine) return;
      
      const lineText = currentLine.textContent || '';

      // Tab 键处理
      if (e.key === 'Tab') {
        e.preventDefault();
        
        // 检查是否是列表项
        const unorderedMatch = lineText.match(/^(\s*)([-*+])\s(.*)$/);
        const orderedMatch = lineText.match(/^(\s*)(\d+)\.\s(.*)$/);
        
        if (unorderedMatch || orderedMatch) {
          // 在列表中，处理缩进
          const [fullMatch, currentIndent, marker, content] = unorderedMatch || orderedMatch || [];
          const isOrdered = !!orderedMatch;
          
          if (e.shiftKey) {
            // Shift+Tab: 减少缩进
            if (currentIndent.length >= 2) {
              // 计算光标在当前行内的相对位置
              const cursorOffset = getCursorOffset();
              const lines = getPlainText(editorRef.current!).split('\n');
              const lineIndex = Array.from(editorRef.current!.querySelectorAll('.markdown-line')).indexOf(currentLine);
              
              // 计算光标在行内的位置
              let lineStartOffset = 0;
              for (let i = 0; i < lineIndex; i++) {
                lineStartOffset += lines[i].length + 1;
              }
              const positionInLine = cursorOffset - lineStartOffset;
              
              const newIndent = currentIndent.substring(2);
              let newLine;
              
              if (isOrdered) {
                // 对于有序列表，需要根据上下文调整序号
                if (newIndent.length === 0) {
                  // 返回到顶层，需要找到合适的序号
                  let newNumber = 1;
                  // 向上查找同级别的最后一个有序列表项
                  for (let i = lineIndex - 1; i >= 0; i--) {
                    const prevLine = lines[i];
                    const prevMatch = prevLine.match(/^(\d+)\.\s/);
                    if (prevMatch) {
                      newNumber = parseInt(prevMatch[1]) + 1;
                      break;
                    }
                    // 如果遇到非列表项，停止查找
                    if (!prevLine.match(/^\s*[-*+\d]+[\.\s]/)) {
                      break;
                    }
                  }
                  newLine = `${newNumber}. ${content}`;
                } else {
                  // 仍然是子列表，保持原序号
                  newLine = `${newIndent}${marker}. ${content}`;
                }
              } else {
                // 无序列表，保持原样
                newLine = `${newIndent}${marker} ${content}`;
              }
              
              // 更新整行内容
              lines[lineIndex] = newLine;
              
              const newContent = lines.join('\n');
              notifyChange(newContent);
              renderContent(newContent);
              
              // 调整光标位置，保持在行内的相对位置
              // 如果光标在缩进部分，则移到新缩进的末尾
              // 否则保持相对位置，但要减去移除的2个空格
              setTimeout(() => {
                let newPosition;
                if (positionInLine <= currentIndent.length) {
                  // 光标在缩进部分，移到新缩进末尾
                  newPosition = lineStartOffset + newIndent.length;
                } else {
                  // 光标在内容部分，保持相对位置
                  newPosition = lineStartOffset + positionInLine - 2;
                }
                setCursorOffset(Math.max(lineStartOffset, newPosition));
              }, 0);
            }
          } else {
            // Tab: 增加缩进
            const newIndent = currentIndent + '  ';
            let newLine;
            
            if (isOrdered) {
              // 对于有序列表，子列表从 1 开始
              const lines = getPlainText(editorRef.current!).split('\n');
              const lineIndex = Array.from(editorRef.current!.querySelectorAll('.markdown-line')).indexOf(currentLine);
              
              // 检查是否是第一个进入这个缩进级别的项
              let isFirstAtThisLevel = true;
              let newNumber = 1;
              
              // 向上查找相同缩进级别的最后一个有序列表项
              for (let i = lineIndex - 1; i >= 0; i--) {
                const prevLine = lines[i];
                const prevMatch = prevLine.match(/^(\s*)(\d+)\.\s/);
                if (prevMatch && prevMatch[1].length === newIndent.length) {
                  // 找到同级别的有序列表项
                  newNumber = parseInt(prevMatch[2]) + 1;
                  isFirstAtThisLevel = false;
                  break;
                } else if (prevMatch && prevMatch[1].length < newIndent.length) {
                  // 遇到上一级列表，说明这是新的子列表级别
                  break;
                }
              }
              
              newLine = `${newIndent}${newNumber}. ${content}`;
            } else {
              // 无序列表，保持原标记
              newLine = `${newIndent}${marker} ${content}`;
            }
            
            // 更新整行内容
            const lines = getPlainText(editorRef.current!).split('\n');
            const lineIndex = Array.from(editorRef.current!.querySelectorAll('.markdown-line')).indexOf(currentLine);
            lines[lineIndex] = newLine;
            
            const cursorOffset = getCursorOffset();
            const newContent = lines.join('\n');
            notifyChange(newContent);
            renderContent(newContent);
            
            // 调整光标位置（增加2个字符）
            setTimeout(() => {
              setCursorOffset(cursorOffset + 2);
            }, 0);
          }
        } else {
          // 不在列表中，插入制表符
          const textNode = document.createTextNode('\t');
          range.deleteContents();
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
          handleInput();
        }
      }
      
      // Enter 键处理
      else if (e.key === 'Enter') {
        e.preventDefault();
        
        // 获取当前光标位置
        const currentOffset = getCursorOffset();
        
        // 检查光标是否在行尾
        const isAtEnd = isCursorAtLineEnd(range, currentLine);
        
        // 检查是否是列表项
        const unorderedMatch = lineText.match(/^(\s*)([-*+])\s/);
        const orderedMatch = lineText.match(/^(\s*)(\d+)\.\s/);
        
        let newLineContent = '\n';
        let cursorOffsetAdjustment = 1; // 默认光标移动到下一行开头
        
        if (unorderedMatch) {
          const [, indent, marker] = unorderedMatch;
          const restOfLine = lineText.substring(unorderedMatch[0].length);
          
          if (restOfLine.trim() === '') {
            // 空列表项，移除当前行的列表标记
            lines[lineIndex] = '';
            lines.splice(lineIndex + 1, 0, '');
            const newContent = lines.join('\n');
            notifyChange(newContent);
            renderContent(newContent);
            
            // 光标移到新的空行
            setTimeout(() => {
              setCursorOffset(lineStartOffset);
            }, 0);
            return;
          } else if (isAtEnd) {
            // 在行尾，创建新列表项
            newLineContent = `\n${indent}${marker} `;
            cursorOffsetAdjustment = newLineContent.length;
          } else {
            // 在行中间，只换行
            newLineContent = '\n';
          }
        } else if (orderedMatch) {
          const [, indent, number] = orderedMatch;
          const restOfLine = lineText.substring(orderedMatch[0].length);
          
          if (restOfLine.trim() === '') {
            // 空列表项，移除当前行的列表标记
            lines[lineIndex] = '';
            lines.splice(lineIndex + 1, 0, '');
            const newContent = lines.join('\n');
            notifyChange(newContent);
            renderContent(newContent);
            
            // 光标移到新的空行
            setTimeout(() => {
              setCursorOffset(lineStartOffset);
            }, 0);
            return;
          } else if (isAtEnd) {
            // 在行尾，创建新列表项，数字递增
            const nextNumber = parseInt(number) + 1;
            newLineContent = `\n${indent}${nextNumber}. `;
            cursorOffsetAdjustment = newLineContent.length;
          } else {
            // 在行中间，只换行
            newLineContent = '\n';
          }
        }
        
        // 获取当前行在整个文本中的位置
        const lines = getPlainText(editorRef.current!).split('\n');
        const lineIndex = Array.from(editorRef.current!.querySelectorAll('.markdown-line')).indexOf(currentLine);
        
        // 计算在当前行内的位置
        let lineStartOffset = 0;
        for (let i = 0; i < lineIndex; i++) {
          lineStartOffset += lines[i].length + 1;
        }
        const positionInLine = currentOffset - lineStartOffset;
        
        // 插入新行内容
        const beforeCursor = lineText.substring(0, positionInLine);
        const afterCursor = lineText.substring(positionInLine);
        
        lines[lineIndex] = beforeCursor;
        lines.splice(lineIndex + 1, 0, afterCursor);
        
        // 如果需要添加列表前缀，将它添加到新行
        if (newLineContent.length > 1) {
          lines[lineIndex + 1] = newLineContent.substring(1) + lines[lineIndex + 1];
        }
        
        const newContent = lines.join('\n');
        notifyChange(newContent);
        renderContent(newContent);
        
        // 计算新的光标位置
        // 对于普通换行（没有列表前缀），光标应该在新行开头
        // 对于列表换行，光标应该在列表前缀之后
        const newCursorPosition = lineStartOffset + beforeCursor.length + 1 + (newLineContent.length > 1 ? newLineContent.length - 1 : 0);
        
        // 设置光标位置
        setTimeout(() => {
          setCursorOffset(newCursorPosition);
        }, 0);
      }
      
      // Backspace 键处理
      else if (e.key === 'Backspace') {
        // 检查光标是否在行首
        if (isCursorAtLineStart(range, currentLine)) {
          e.preventDefault();
          
          // 获取所有行
          const lines = editorRef.current!.querySelectorAll('.markdown-line');
          const lineIndex = Array.from(lines).indexOf(currentLine);
          
          if (lineIndex > 0) {
            // 有上一行，合并到上一行
            const prevLine = lines[lineIndex - 1];
            const prevLineLength = (prevLine.textContent || '').length;
            
            // 获取纯文本内容
            const textLines = getPlainText(editorRef.current!).split('\n');
            
            // 合并行
            textLines[lineIndex - 1] += textLines[lineIndex];
            textLines.splice(lineIndex, 1);
            
            const newContent = textLines.join('\n');
            notifyChange(newContent);
            renderContent(newContent);
            
            // 设置光标到上一行末尾
            setTimeout(() => {
              // 计算上一行末尾的偏移量
              let offset = 0;
              for (let i = 0; i < lineIndex - 1; i++) {
                offset += textLines[i].length + 1;
              }
              // 加上上一行原本的长度（合并前）
              offset += prevLineLength;
              setCursorOffset(offset);
            }, 0);
          }
        }
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