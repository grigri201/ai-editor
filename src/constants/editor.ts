// CSS 类名常量
export const CSS_CLASSES = {
  EDITOR_WRAPPER: 'markdown-editor-wrapper',
  EDITOR_CONTENT: 'markdown-editor-content',
  LINE: 'markdown-line',
  SYNTAX: 'markdown-syntax',
  HEADING: {
    H1: 'markdown-h1',
    H2: 'markdown-h2',
    H3: 'markdown-h3',
    H4: 'markdown-h4',
    H5: 'markdown-h5',
    H6: 'markdown-h6',
  },
  LIST_CONTENT: 'markdown-list-content',
  INLINE_CODE: 'markdown-inline-code',
  CODE_BLOCK: 'markdown-code-block',
  CODE_LANG: 'markdown-code-lang',
  CODE_END: 'markdown-code-end',
  LINK: 'markdown-link',
  BLOCKQUOTE: 'markdown-blockquote',
  QUOTE_CONTENT: 'markdown-quote-content',
  HR: 'markdown-hr',
  HR_LINE: 'markdown-hr-line',
} as const;

// 编辑器配置常量
export const EDITOR_CONFIG = {
  DEBOUNCE_DELAY: 100, // 防抖延迟时间（毫秒）
  DEFAULT_HEIGHT: 500, // 默认高度
  LIST_INDENT_SIZE: 2, // 列表缩进空格数
} as const;

// Markdown 语法正则表达式
export const MARKDOWN_PATTERNS = {
  // 标题
  HEADING: /^(#{1,6})\s+(.*)$/,
  // 无序列表
  UNORDERED_LIST: /^(\s*)([-*+])\s+(.*)$/,
  UNORDERED_LIST_MARKER: /^(\s*)([-*+])\s/,
  // 有序列表
  ORDERED_LIST: /^(\s*)(\d+)\.\s+(.*)$/,
  ORDERED_LIST_MARKER: /^(\s*)(\d+)\.\s/,
  // 粗体
  BOLD_ASTERISK: /\*\*([^*]+)\*\*/g,
  BOLD_UNDERSCORE: /__([^_]+)__/g,
  // 斜体
  ITALIC_ASTERISK: /(?<!\*)\*([^*]+)\*(?!\*)/g,
  ITALIC_UNDERSCORE: /(?<!_)_([^_]+)_(?!_)/g,
  // 行内代码
  INLINE_CODE: /`([^`]+)`/g,
  // 链接
  LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  // 引用块
  BLOCKQUOTE: /^>\s+(.*)$/,
  // 分隔线
  HORIZONTAL_RULE: /^(---|\*\*\*|___)$/,
  // 代码块
  CODE_BLOCK: /```(\w*)\n([\s\S]*?)```/g,
} as const;

// 键盘按键常量
export const KEYS = {
  TAB: 'Tab',
  ENTER: 'Enter',
  BACKSPACE: 'Backspace',
} as const;