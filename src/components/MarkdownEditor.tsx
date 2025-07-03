'use client';

import React, { useRef, useImperativeHandle, forwardRef, useCallback, KeyboardEvent, useEffect, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);
        
        onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + text.length, start + text.length);
        }, 0);
      },
      deleteText: (length: number) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const newStart = Math.max(0, start - length);
        const newValue = value.substring(0, newStart) + value.substring(start);
        
        onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newStart, newStart);
        }, 0);
      },
      getCursorPosition: () => {
        return textareaRef.current?.selectionStart || 0;
      },
      setCursorPosition: (position: number) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        textarea.focus();
        textarea.setSelectionRange(position, position);
      }
    }));

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        const textarea = e.currentTarget;
        const cursorPos = textarea.selectionStart;
        const lines = value.substring(0, cursorPos).split('\n');
        const currentLine = lines[lines.length - 1];
        
        // 检查当前行是否是列表项
        const unorderedListMatch = currentLine.match(/^(\s*)([-*+])\s/);
        const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
        
        if (unorderedListMatch) {
          e.preventDefault();
          const [, indent, marker] = unorderedListMatch;
          const restOfLine = currentLine.substring(unorderedListMatch[0].length);
          
          if (restOfLine.trim() === '') {
            // 如果当前列表项为空，删除该行的列表标记
            const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
            const newValue = value.substring(0, lineStart) + value.substring(cursorPos);
            onChange(newValue);
            setTimeout(() => {
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          } else {
            // 插入新的列表项
            const newLine = `\n${indent}${marker} `;
            const newValue = value.substring(0, cursorPos) + newLine + value.substring(cursorPos);
            onChange(newValue);
            setTimeout(() => {
              const newPos = cursorPos + newLine.length;
              textarea.setSelectionRange(newPos, newPos);
            }, 0);
          }
        } else if (orderedListMatch) {
          e.preventDefault();
          const [, indent, number] = orderedListMatch;
          const restOfLine = currentLine.substring(orderedListMatch[0].length);
          
          if (restOfLine.trim() === '') {
            // 如果当前列表项为空，删除该行的列表标记
            const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
            const newValue = value.substring(0, lineStart) + value.substring(cursorPos);
            onChange(newValue);
            setTimeout(() => {
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          } else {
            // 插入新的列表项，数字自动递增
            const nextNumber = parseInt(number) + 1;
            const newLine = `\n${indent}${nextNumber}. `;
            const newValue = value.substring(0, cursorPos) + newLine + value.substring(cursorPos);
            onChange(newValue);
            setTimeout(() => {
              const newPos = cursorPos + newLine.length;
              textarea.setSelectionRange(newPos, newPos);
            }, 0);
          }
        }
      }
    }, [value, onChange]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    const handleCursorChange = () => {
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current.selectionStart);
      }
    };

    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.addEventListener('keyup', handleCursorChange);
        textarea.addEventListener('click', handleCursorChange);
        return () => {
          textarea.removeEventListener('keyup', handleCursorChange);
          textarea.removeEventListener('click', handleCursorChange);
        };
      }
    }, []);

    return (
      <div 
        ref={editorRef} 
        className="markdown-editor-single-column"
        style={{ height }}
      >
        <div className="editor-container">
          {/* 隐藏的文本框用于输入 */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="editor-textarea"
            placeholder="请输入 Markdown 内容..."
            spellCheck={false}
          />
          
          {/* 渲染层 */}
          <div className="editor-preview">
            {value ? (
              <MarkdownRenderer content={value} preserveSyntax={true} />
            ) : (
              <div className="editor-placeholder">请输入 Markdown 内容...</div>
            )}
            {isFocused && (
              <div className="editor-cursor" style={{ animationName: 'blink' }}>|</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;