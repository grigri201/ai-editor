import { EditorView } from '@codemirror/view';
import { EditorState, Transaction, StateCommand } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { insertNewlineContinueMarkup, deleteMarkupBackward } from '@codemirror/lang-markdown';

// 获取当前行的文本
function getCurrentLine(state: EditorState, pos: number): string {
  const line = state.doc.lineAt(pos);
  return state.sliceDoc(line.from, line.to);
}

// 获取列表项的缩进级别
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// 解析列表项
interface ListInfo {
  indent: string;
  marker: string;
  content: string;
  isOrdered: boolean;
  number?: number;
}

function parseListItem(line: string): ListInfo | null {
  // 无序列表
  const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
  if (unorderedMatch) {
    return {
      indent: unorderedMatch[1],
      marker: unorderedMatch[2],
      content: unorderedMatch[3],
      isOrdered: false,
    };
  }

  // 有序列表
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (orderedMatch) {
    return {
      indent: orderedMatch[1],
      marker: orderedMatch[2],
      content: orderedMatch[3],
      isOrdered: true,
      number: parseInt(orderedMatch[2]),
    };
  }

  // 任务列表
  const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ x])\]\s+(.*)$/);
  if (taskMatch) {
    return {
      indent: taskMatch[1],
      marker: `${taskMatch[2]} [${taskMatch[3]}]`,
      content: taskMatch[4],
      isOrdered: false,
    };
  }

  return null;
}

// 处理列表中的 Enter 键
// 使用 CodeMirror 内置的 insertNewlineContinueMarkup，并添加空列表项退出功能
export const listEnterCommand: StateCommand = (target) => {
  const { state, dispatch } = target;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.sliceDoc(line.from, line.to);
  const listInfo = parseListItem(lineText);

  // 如果是空列表项，退出列表
  if (listInfo && listInfo.content.trim() === '') {
    const changes = {
      from: line.from,
      to: line.to,
      insert: '',
    };
    
    if (dispatch) {
      dispatch(state.update({ changes, selection: { anchor: line.from } }));
    }
    return true;
  }

  // 否则使用内置的 insertNewlineContinueMarkup
  return insertNewlineContinueMarkup(target);
};

// 处理列表中的 Tab 键（增加缩进）
export const listIndentCommand: StateCommand = ({ state, dispatch }) => {
  const { from, to } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.sliceDoc(line.from, line.to);
  const listInfo = parseListItem(lineText);

  if (!listInfo) {
    return false; // 不是列表项
  }

  // 增加四个空格的缩进
  const newIndent = listInfo.indent + '    ';
  const newLine = newIndent + (listInfo.isOrdered ? '1. ' : `${listInfo.marker} `) + listInfo.content;

  if (dispatch) {
    dispatch(state.update({
      changes: { from: line.from, to: line.to, insert: newLine },
      selection: { anchor: from + 4 }, // 光标向右移动 4 个位置
    }));
  }
  return true;
};

// 处理列表中的 Shift+Tab（减少缩进）
export const listDedentCommand: StateCommand = ({ state, dispatch }) => {
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.sliceDoc(line.from, line.to);
  const listInfo = parseListItem(lineText);

  if (!listInfo || listInfo.indent.length < 4) {
    return false; // 不是列表项或已经在顶层
  }

  // 减少四个空格的缩进
  const newIndent = listInfo.indent.substring(4);
  const newLine = newIndent + (listInfo.isOrdered ? '1. ' : `${listInfo.marker} `) + listInfo.content;

  if (dispatch) {
    dispatch(state.update({
      changes: { from: line.from, to: line.to, insert: newLine },
      selection: { anchor: Math.max(line.from, from - 4) }, // 光标向左移动 4 个位置
    }));
  }
  return true;
};

// 智能 Backspace（在列表开头删除列表标记）
// 首先尝试使用 CodeMirror 内置的 deleteMarkupBackward
export const listBackspaceCommand: StateCommand = (target) => {
  // 先尝试内置命令
  if (deleteMarkupBackward(target)) {
    return true;
  }
  
  // 如果内置命令没有处理，使用我们的自定义逻辑
  const { state, dispatch } = target;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.sliceDoc(line.from, line.to);
  const listInfo = parseListItem(lineText);

  if (!listInfo) {
    return false;
  }

  // 计算光标在列表标记后的位置
  const markerEnd = line.from + listInfo.indent.length + 
    (listInfo.isOrdered ? `${listInfo.number}. `.length : `${listInfo.marker} `.length);

  // 如果光标正好在列表标记后面
  if (from === markerEnd) {
    // 删除整个列表标记，只保留内容
    const newLine = listInfo.indent + listInfo.content;
    
    if (dispatch) {
      dispatch(state.update({
        changes: { from: line.from, to: line.to, insert: newLine },
        selection: { anchor: line.from + listInfo.indent.length },
      }));
    }
    return true;
  }

  return false;
};