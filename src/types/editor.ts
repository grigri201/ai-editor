// 编辑器引用接口
export interface MarkdownEditorRef {
  insertText: (position: number, text: string) => void;
  deleteText: (position: number, length: number) => void;
  getCursorPosition: () => number;
  setCursorPosition: (position: number) => void;
  getValue: () => string;
  setValue: (text: string) => void;
  replaceRange: (text: string, from: number, to: number) => void;
}

// 编辑器属性接口
export interface MarkdownEditorProps {
  value: string;
  onChange: (value?: string) => void;
  height?: number;
}

// 光标位置信息
export interface CursorPosition {
  offset: number;
  lineIndex: number;
  positionInLine: number;
}

// 列表项匹配结果
export interface ListMatch {
  fullMatch: string;
  indent: string;
  marker: string;
  content: string;
  isOrdered: boolean;
  number?: string;
}

// 行信息
export interface LineInfo {
  text: string;
  index: number;
  element: HTMLElement;
  startOffset: number;
  endOffset: number;
}

// 键盘事件处理器参数
export interface KeyboardHandlerParams {
  event: React.KeyboardEvent<HTMLDivElement>;
  currentLine: HTMLElement;
  lineText: string;
  editorElement: HTMLDivElement;
  getCursorOffset: () => number;
  setCursorOffset: (offset: number) => void;
  getPlainText: (element: HTMLElement) => string;
  notifyChange: (content: string) => void;
  renderContent: (text: string) => void;
  handleInput: () => void;
}

// 渲染选项
export interface RenderOptions {
  preserveSyntax?: boolean;
  escapeHtml?: boolean;
}