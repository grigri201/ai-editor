import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// 创建装饰器样式
const markdownFormattingMark = Decoration.mark({ class: 'cm-formatting' });
const markdownFormattingStrongMark = Decoration.mark({ class: 'cm-formatting-strong' });
const markdownFormattingEmMark = Decoration.mark({ class: 'cm-formatting-em' });
const markdownFormattingCodeMark = Decoration.mark({ class: 'cm-formatting-code' });
const markdownFormattingLinkMark = Decoration.mark({ class: 'cm-formatting-link' });
const markdownFormattingHeaderMark = Decoration.mark({ class: 'cm-formatting-header' });
const markdownFormattingQuoteMark = Decoration.mark({ class: 'cm-formatting-quote' });
const markdownFormattingListMark = Decoration.mark({ class: 'cm-formatting-list' });

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

      // 遍历语法树
      tree.iterate({
        enter: (node) => {
          const { from, to } = node;
          
          // 根据节点类型添加装饰
          switch (node.name) {
            // 强调符号
            case 'EmphasisMark':
              builder.add(from, to, markdownFormattingEmMark);
              break;
            
            // 加粗符号
            case 'StrongEmphasisMark':
              builder.add(from, to, markdownFormattingStrongMark);
              break;
            
            // 代码符号
            case 'CodeMark':
              builder.add(from, to, markdownFormattingCodeMark);
              break;
            
            // 标题符号
            case 'HeaderMark':
              builder.add(from, to, markdownFormattingHeaderMark);
              break;
            
            // 引用符号
            case 'QuoteMark':
              builder.add(from, to, markdownFormattingQuoteMark);
              break;
            
            // 列表符号
            case 'ListMark':
              builder.add(from, to, markdownFormattingListMark);
              break;
            
            // 链接括号
            case 'LinkMark':
              builder.add(from, to, markdownFormattingLinkMark);
              break;
          }
        },
      });

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

// 增强的 Markdown 配置
export function createMarkdownExtensions() {
  return [
    markdownSyntaxHighlighting,
  ];
}