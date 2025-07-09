import { ViewPlugin, Decoration, EditorView, ViewUpdate, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, Range, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

// 定义接受/拒绝 diff 的 effect
export const acceptDiffEffect = StateEffect.define<{ from: number; to: number }>();
export const rejectDiffEffect = StateEffect.define<{ from: number; to: number }>();

// 内联按钮 Widget
class DiffControlWidget extends WidgetType {
  constructor(
    private from: number,
    private to: number,
    private type: 'add' | 'delete' | 'replace',
    private deleteText?: string,
    private addText?: string,
    private onAccept: () => void,
    private onReject: () => void
  ) {
    super();
  }

  toDOM() {
    const container = document.createElement('span');
    container.className = 'cm-diff-controls';
    container.style.cssText = `
      display: inline-flex;
      gap: 2px;
      margin-left: 8px;
      vertical-align: middle;
    `;

    // 接受按钮
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'cm-diff-accept';
    acceptBtn.innerHTML = '✓';
    acceptBtn.title = '接受修改';
    acceptBtn.style.cssText = `
      background: #10b981;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
    `;
    acceptBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onAccept();
    };

    // 拒绝按钮
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'cm-diff-reject';
    rejectBtn.innerHTML = '✗';
    rejectBtn.title = '拒绝修改';
    rejectBtn.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
    `;
    rejectBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onReject();
    };

    container.appendChild(acceptBtn);
    container.appendChild(rejectBtn);

    return container;
  }

  eq(other: WidgetType) {
    return other instanceof DiffControlWidget &&
      other.from === this.from &&
      other.to === this.to &&
      other.type === this.type;
  }

  ignoreEvent() {
    return false;
  }
}

// 解析 diff 标记位置的辅助函数
function findDiffMarkers(view: EditorView): Array<{ from: number; to: number; type: 'add' | 'delete' | 'replace'; deleteText?: string; addText?: string }> {
  const markers: Array<{ from: number; to: number; type: 'add' | 'delete' | 'replace'; deleteText?: string; addText?: string }> = [];
  const doc = view.state.doc;
  const text = doc.toString();
  
  // 匹配组合格式和单独格式
  const regex = /\[(?:\{-\}([^\{\]]+))?(?:\{\+\}([^\]]+))?\]/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const from = match.index;
    const to = match.index + match[0].length;
    const deleteText = match[1];
    const addText = match[2];
    
    // 跳过空的标记
    if (!deleteText && !addText) continue;
    
    let type: 'add' | 'delete' | 'replace';
    if (deleteText && addText) {
      type = 'replace';
    } else if (deleteText) {
      type = 'delete';
    } else {
      type = 'add';
    }
    
    markers.push({ from, to, type, deleteText, addText });
  }
  
  return markers;
}

// Diff 控制插件
export const diffInlineControls = ViewPlugin.fromClass(
  class {
    decorations: RangeSet<Decoration>;
    view: EditorView;

    constructor(view: EditorView) {
      this.view = view;
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): RangeSet<Decoration> {
      const widgets: Range<Decoration>[] = [];
      const markers = findDiffMarkers(view);
      
      for (const marker of markers) {
        // 创建按钮 widget
        const widget = new DiffControlWidget(
          marker.from,
          marker.to,
          marker.type,
          marker.deleteText,
          marker.addText,
          () => this.acceptDiff(marker),
          () => this.rejectDiff(marker)
        );
        
        // 将 widget 添加到标记的末尾
        widgets.push(Decoration.widget({ widget }).range(marker.to));
      }
      
      return RangeSet.of(widgets);
    }

    acceptDiff(marker: { from: number; to: number; type: 'add' | 'delete' | 'replace'; deleteText?: string; addText?: string }) {
      let insertText = '';
      
      if (marker.type === 'add') {
        // 纯添加：保留添加的内容
        insertText = marker.addText || '';
      } else if (marker.type === 'delete') {
        // 纯删除：移除所有内容
        insertText = '';
      } else if (marker.type === 'replace') {
        // 替换：保留添加的内容
        insertText = marker.addText || '';
      }
      
      this.view.dispatch({
        changes: { from: marker.from, to: marker.to, insert: insertText }
      });
    }

    rejectDiff(marker: { from: number; to: number; type: 'add' | 'delete' | 'replace'; deleteText?: string; addText?: string }) {
      let insertText = '';
      
      if (marker.type === 'add') {
        // 纯添加：移除所有内容
        insertText = '';
      } else if (marker.type === 'delete') {
        // 纯删除：保留删除的内容
        insertText = marker.deleteText || '';
      } else if (marker.type === 'replace') {
        // 替换：保留删除的内容
        insertText = marker.deleteText || '';
      }
      
      this.view.dispatch({
        changes: { from: marker.from, to: marker.to, insert: insertText }
      });
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);