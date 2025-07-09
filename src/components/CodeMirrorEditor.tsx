'use client';

import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState, StateEffect } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { MarkdownEditorRef, MarkdownEditorProps } from '@/types/editor';

export type { MarkdownEditorRef };
import { createMarkdownExtensions, markdownHighlightStyle } from '@/utils/codemirror-markdown';
import { HighlightStyle } from '@codemirror/language';
import { listEnterCommand, listIndentCommand, listDedentCommand, listBackspaceCommand } from '@/utils/codemirror-commands';
import { diffInlineControls } from '@/utils/codemirror-diff-inline';

// 自定义明亮主题
const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '16px',
  },
  '.cm-editor': {
    height: '100%',
  },
  '.cm-editor.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    padding: '1.5rem',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  '.cm-line': {
    padding: '0.125rem 0',
    lineHeight: '1.5',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
  },
  // Markdown 语法标记样式 - 灰色显示
  '.cm-formatting': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-strong': {
    color: 'rgba(0, 0, 0, 0.3)',
    fontWeight: 'normal',
  },
  '.cm-formatting-em': {
    color: 'rgba(0, 0, 0, 0.3)',
    fontStyle: 'normal',
  },
  '.cm-formatting-strikethrough': {
    color: 'rgba(0, 0, 0, 0.3)',
    textDecoration: 'none',
  },
  '.cm-formatting-code': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-code-block': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-link': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-link-string': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-header': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-quote': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-list': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-task': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-formatting-highlight': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  // 内容样式
  '.cm-strong': {
    fontWeight: 'bold',
  },
  '.cm-emphasis': {
    fontStyle: 'italic',
  },
  '.cm-strikethrough': {
    textDecoration: 'line-through',
  },
  '.cm-link': {
    color: '#0969da',
    textDecoration: 'underline',
  },
  '.cm-url': {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-header': {
    fontWeight: 'bold',
  },
  '.cm-header-1': {
    fontSize: '2em',
    lineHeight: '1.2',
  },
  '.cm-header-2': {
    fontSize: '1.5em',
    lineHeight: '1.3',
  },
  '.cm-header-3': {
    fontSize: '1.25em',
    lineHeight: '1.4',
  },
  '.cm-header-4': {
    fontSize: '1.1em',
  },
  '.cm-header-5': {
    fontSize: '1.05em',
  },
  '.cm-header-6': {
    fontSize: '1em',
  },
  '.cm-quote': {
    color: '#57606a',
    borderLeft: '4px solid #d1d9e0',
    paddingLeft: '0.5rem',
    marginLeft: '0',
  },
  '.cm-list': {
    paddingLeft: '0',
  },
  '.cm-code': {
    backgroundColor: 'rgba(175, 184, 193, 0.2)',
    padding: '0.2em 0.4em',
    borderRadius: '3px',
    fontSize: '85%',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  '.cm-codeblock': {
    backgroundColor: '#f6f8fa',
    padding: '0.5rem',
    borderRadius: '6px',
    fontSize: '85%',
    lineHeight: '1.45',
  },
  '.cm-hr': {
    borderBottom: '4px solid #d1d9e0',
    display: 'block',
    height: '24px',
    margin: '16px 0',
  },
  // 光标和选择
  '.cm-cursor': {
    borderLeftColor: '#000',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  '.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
}, { dark: false });


// 创建自定义高亮样式
const customHighlightStyle = HighlightStyle.define([
  ...defaultHighlightStyle.specs,
  ...markdownHighlightStyle,
]);

// 基础扩展配置
const basicExtensions = [
  history(),
  drawSelection(),
  dropCursor(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  highlightSelectionMatches(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  syntaxHighlighting(customHighlightStyle),
  keymap.of([
    // 自定义列表快捷键
    { key: 'Enter', run: listEnterCommand },
    { key: 'Tab', run: listIndentCommand },
    { key: 'Shift-Tab', run: listDedentCommand },
    { key: 'Backspace', run: listBackspaceCommand },
    // 默认快捷键
    ...defaultKeymap,
    ...historyKeymap,
    ...searchKeymap,
    ...completionKeymap,
    ...closeBracketsKeymap,
    indentWithTab,
  ]),
];

const CodeMirrorEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ value, onChange }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isUserInputRef = useRef(true);

    // 创建编辑器实例
    useEffect(() => {
      if (!editorRef.current || viewRef.current) return;

      const startState = EditorState.create({
        doc: value,
        extensions: [
          ...basicExtensions,
          markdown(),
          ...createMarkdownExtensions(),
          diffInlineControls,
          lightTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              isUserInputRef.current = true;
              const content = update.state.doc.toString();
              onChange(content);
            }
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []); // 只在组件挂载时创建编辑器


    // 当外部 value 改变时更新内容
    useEffect(() => {
      if (!viewRef.current) return;
      
      // 如果是用户输入导致的更新，不需要再次更新编辑器
      if (isUserInputRef.current) {
        isUserInputRef.current = false;
        return;
      }
      
      const currentContent = viewRef.current.state.doc.toString();
      if (value !== currentContent) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: value,
          },
        });
      }
    }, [value]);

    // 实现 ref 接口
    useImperativeHandle(ref, () => ({
      insertText: (position: number, text: string) => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        
        view.dispatch({
          changes: { from: position, to: position, insert: text },
        });
        
        view.focus();
      },
      deleteText: (position: number, length: number) => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        
        view.dispatch({
          changes: { from: position, to: position + length },
        });
      },
      getCursorPosition: () => {
        if (!viewRef.current) return 0;
        return viewRef.current.state.selection.main.head;
      },
      setCursorPosition: (position: number) => {
        if (!viewRef.current) return;
        
        viewRef.current.dispatch({
          selection: { anchor: position },
        });
        viewRef.current.focus();
      },
      getValue: () => {
        if (!viewRef.current) return '';
        return viewRef.current.state.doc.toString();
      },
      setValue: (text: string) => {
        if (!viewRef.current) return;
        
        const view = viewRef.current;
        const currentContent = view.state.doc.toString();
        
        view.dispatch({
          changes: { from: 0, to: currentContent.length, insert: text },
        });
      },
      replaceRange: (text: string, from: number, to: number) => {
        if (!viewRef.current) return;
        
        const view = viewRef.current;
        
        view.dispatch({
          changes: { from, to, insert: text },
        });
      },
    }));

    return (
      <div className="h-full w-full overflow-hidden rounded-xl border border-gray-200">
        <div ref={editorRef} className="h-full" />
      </div>
    );
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default CodeMirrorEditor;