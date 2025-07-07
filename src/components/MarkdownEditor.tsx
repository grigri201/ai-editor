'use client';

import React, { useRef, useImperativeHandle, forwardRef, useCallback, KeyboardEvent, useEffect, useState } from 'react';
import { MarkdownEditorRef, MarkdownEditorProps, KeyboardHandlerParams } from '@/types/editor';
import { CSS_CLASSES, EDITOR_CONFIG, KEYS } from '@/constants/editor';
import { debounce } from '@/utils/common';
import { renderMarkdownContent, getPlainTextFromEditor } from '@/utils/markdown';
import { getCursorOffset, setCursorOffset, setCursorInLine } from '@/utils/cursor';
import { handleTabKey, handleEnterKey, handleBackspaceKey } from '@/utils/keyboard';

export type { MarkdownEditorRef };

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ value, onChange }, ref) => {
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

    // 获取光标位置（相对于纯文本）
    const getCursorOffsetWrapper = useCallback((): number => {
      if (!editorRef.current) return 0;
      try {
        return getCursorOffset(editorRef.current);
      } catch (error) {
        console.warn('获取光标位置失败:', error);
        return 0;
      }
    }, []);

    // 设置光标位置
    const setCursorOffsetWrapper = useCallback((offset: number) => {
      if (!editorRef.current) return;
      try {
        setCursorOffset(editorRef.current, offset);
      } catch (error) {
        console.warn('设置光标位置失败:', error);
      }
    }, []);

    // 渲染 Markdown 内容，保留语法
    const renderContent = useCallback((text: string) => {
      if (!editorRef.current || isRenderingRef.current) return;
      
      isRenderingRef.current = true;
      
      // 特殊处理空文本
      if (!text || text.trim() === '') {
        editorRef.current.innerHTML = `<div class="${CSS_CLASSES.LINE}" data-line="0"><br></div>`;
        isRenderingRef.current = false;
        return;
      }
      
      // 保存光标位置
      const cursorOffset = getCursorOffsetWrapper();
      lastCursorPositionRef.current = cursorOffset;
      
      const html = renderMarkdownContent(text);
      editorRef.current.innerHTML = html;
      
      // 使用 requestAnimationFrame 恢复光标位置
      requestAnimationFrame(() => {
        setCursorOffsetWrapper(cursorOffset);
        isRenderingRef.current = false;
      });
    }, [getCursorOffsetWrapper, setCursorOffsetWrapper]);

    // 防抖的渲染函数
    const debouncedRender = useCallback(
      debounce((text: string) => {
        renderContent(text);
      }, EDITOR_CONFIG.DEBOUNCE_DELAY),
      [renderContent]
    );

    // 获取纯文本内容
    const getPlainText = useCallback((element: HTMLElement): string => {
      return getPlainTextFromEditor(element);
    }, []);

    // 处理输入事件
    const handleInput = useCallback(() => {
      if (!editorRef.current || isComposing || isRenderingRef.current) return;
      
      const plainText = getPlainText(editorRef.current);
      notifyChange(plainText);
      
      // 使用防抖渲染
      debouncedRender(plainText);
    }, [isComposing, debouncedRender, notifyChange]);


    // 处理键盘事件
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !editorRef.current) return;
      
      const range = selection.getRangeAt(0);
      const currentLine = range.startContainer.parentElement?.closest(`.${CSS_CLASSES.LINE}`);
      if (!currentLine || !(currentLine instanceof HTMLElement)) return;
      
      const lineText = currentLine.textContent || '';

      const params: KeyboardHandlerParams = {
        event: e,
        currentLine,
        lineText,
        editorElement: editorRef.current,
        getCursorOffset: getCursorOffsetWrapper,
        setCursorOffset: setCursorOffsetWrapper,
        getPlainText,
        notifyChange,
        renderContent,
        handleInput,
      };

      switch (e.key) {
        case KEYS.TAB:
          handleTabKey(params);
          break;
        case KEYS.ENTER:
          handleEnterKey(params);
          break;
        case KEYS.BACKSPACE:
          handleBackspaceKey(params);
          break;
      }
    }, [getCursorOffsetWrapper, setCursorOffsetWrapper, getPlainText, notifyChange, renderContent, handleInput]);

    // 处理粘贴事件
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      
      if (!editorRef.current) return;
      
      // 如果编辑器为空，先创建一个空行
      if (!editorRef.current.firstChild) {
        const line = document.createElement('div');
        line.className = CSS_CLASSES.LINE;
        line.setAttribute('data-line', '0');
        editorRef.current.appendChild(line);
      }
      
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 确保光标在行元素内
      let targetLine = range.startContainer as HTMLElement;
      while (targetLine && targetLine !== editorRef.current && !targetLine.classList?.contains(CSS_CLASSES.LINE)) {
        targetLine = targetLine.parentElement as HTMLElement;
      }
      
      if (!targetLine || targetLine === editorRef.current) {
        targetLine = editorRef.current.querySelector(`.${CSS_CLASSES.LINE}`) as HTMLElement;
        if (targetLine) {
          // 将光标移到第一行
          range.setStart(targetLine, 0);
          range.setEnd(targetLine, 0);
        }
      }
      
      // 删除选中内容
      range.deleteContents();
      
      // 插入文本
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
        return getCursorOffsetWrapper();
      },
      setCursorPosition: (position: number) => {
        if (!editorRef.current) return;
        setCursorOffsetWrapper(position);
        editorRef.current.focus();
      }
    }));


    return (
      <div className={CSS_CLASSES.EDITOR_WRAPPER}>
        <div
          ref={editorRef}
          contentEditable
          className={CSS_CLASSES.EDITOR_CONTENT}
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