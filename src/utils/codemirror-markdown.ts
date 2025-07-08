import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { HIGHLIGHT_ALIASES } from '@/constants/editor';

// 创建装饰器样式
const markdownFormattingMark = Decoration.mark({ class: 'cm-formatting' });
const markdownFormattingStrongMark = Decoration.mark({ class: 'cm-formatting-strong' });
const markdownFormattingEmMark = Decoration.mark({ class: 'cm-formatting-em' });
const markdownFormattingCodeMark = Decoration.mark({ class: 'cm-formatting-code' });
const markdownFormattingLinkMark = Decoration.mark({ class: 'cm-formatting-link' });
const markdownFormattingHeaderMark = Decoration.mark({ class: 'cm-formatting-header' });
const markdownFormattingQuoteMark = Decoration.mark({ class: 'cm-formatting-quote' });
const markdownFormattingListMark = Decoration.mark({ class: 'cm-formatting-list' });
const markdownFormattingHighlightMark = Decoration.mark({ class: 'cm-formatting-highlight' });

// 解析高亮样式
function parseHighlightStyle(style?: string): { color?: string; backgroundColor: string } | null {
  if (!style) return null; // 不支持无样式的高亮
  
  // 只支持 + 和 - 两种样式
  const alias = HIGHLIGHT_ALIASES[style as keyof typeof HIGHLIGHT_ALIASES];
  if (alias) {
    return { color: alias.color, backgroundColor: alias.bg };
  }
  
  // 其他样式都不支持
  return null;
}

// Markdown 语法装饰插件
export const markdownSyntaxHighlighting = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const tree = syntaxTree(view.state);
      const decorations: { from: number; to: number; decoration: Decoration }[] = [];

      // 遍历语法树，收集装饰
      tree.iterate({
        enter: (node) => {
          const { from, to } = node;
          
          // 根据节点类型收集装饰
          switch (node.name) {
            // 强调符号
            case 'EmphasisMark':
              decorations.push({ from, to, decoration: markdownFormattingEmMark });
              break;
            
            // 加粗符号
            case 'StrongEmphasisMark':
              decorations.push({ from, to, decoration: markdownFormattingStrongMark });
              break;
            
            // 代码符号
            case 'CodeMark':
              decorations.push({ from, to, decoration: markdownFormattingCodeMark });
              break;
            
            // 标题符号
            case 'HeaderMark':
              decorations.push({ from, to, decoration: markdownFormattingHeaderMark });
              break;
            
            // 引用符号
            case 'QuoteMark':
              decorations.push({ from, to, decoration: markdownFormattingQuoteMark });
              break;
            
            // 列表符号
            case 'ListMark':
              decorations.push({ from, to, decoration: markdownFormattingListMark });
              break;
            
            // 链接括号
            case 'LinkMark':
              decorations.push({ from, to, decoration: markdownFormattingLinkMark });
              break;
          }
        },
      });

      // 按照 from 位置排序
      decorations.sort((a, b) => a.from - b.from || a.to - b.to);

      // 按顺序添加装饰
      for (const { from, to, decoration } of decorations) {
        builder.add(from, to, decoration);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// 自定义的 Markdown 语法高亮样式
export const markdownHighlightStyle = [
  { tag: tags.heading1, class: 'cm-header cm-header-1' },
  { tag: tags.heading2, class: 'cm-header cm-header-2' },
  { tag: tags.heading3, class: 'cm-header cm-header-3' },
  { tag: tags.heading4, class: 'cm-header cm-header-4' },
  { tag: tags.heading5, class: 'cm-header cm-header-5' },
  { tag: tags.heading6, class: 'cm-header cm-header-6' },
  { tag: tags.strong, class: 'cm-strong' },
  { tag: tags.emphasis, class: 'cm-emphasis' },
  { tag: tags.strikethrough, class: 'cm-strikethrough' },
  { tag: tags.link, class: 'cm-link' },
  { tag: tags.url, class: 'cm-url' },
  { tag: tags.quote, class: 'cm-quote' },
  { tag: tags.list, class: 'cm-list' },
  { tag: tags.monospace, class: 'cm-code' },
];

// 自定义高亮语法插件
export const customHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;
      const text = doc.toString();
      const decorations: { from: number; to: number; decoration: Decoration }[] = [];
      
      // 正则表达式匹配 =={style}text== 或 ==text==
      const highlightRegex = /==(?:\{([^}]+)\})?([^=]+)==/g;
      
      let match;
      while ((match = highlightRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const style = match[1];
        const content = match[2];
        const contentStart = start + 2 + (style ? style.length + 2 : 0);
        const contentEnd = contentStart + content.length;
        
        // 只处理支持的高亮样式
        const highlightStyle = parseHighlightStyle(style);
        if (highlightStyle) {
          // 收集语法标记装饰
          decorations.push({ from: start, to: start + 2, decoration: markdownFormattingHighlightMark }); // 开始 ==
          if (style) {
            decorations.push({ from: start + 2, to: start + 2 + style.length + 2, decoration: markdownFormattingHighlightMark }); // {style}
          }
          decorations.push({ from: contentEnd, to: end, decoration: markdownFormattingHighlightMark }); // 结束 ==
          
          // 收集高亮内容装饰
          const decoration = Decoration.mark({
            attributes: {
              style: `background-color: ${highlightStyle.backgroundColor};${highlightStyle.color ? ` color: ${highlightStyle.color};` : ''}`,
              class: 'cm-highlight'
            }
          });
          decorations.push({ from: contentStart, to: contentEnd, decoration });
        }
      }
      
      // 按照 from 位置排序，如果 from 相同则按 to 排序
      decorations.sort((a, b) => a.from - b.from || a.to - b.to);
      
      // 按顺序添加装饰
      for (const { from, to, decoration } of decorations) {
        builder.add(from, to, decoration);
      }
      
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// 增强的 Markdown 配置
export function createMarkdownExtensions() {
  return [
    markdownSyntaxHighlighting,
    customHighlightPlugin,
  ];
}