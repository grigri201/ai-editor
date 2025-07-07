import { EditorView } from '@codemirror/view';
import { EditorState, Transaction, StateCommand } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

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
export const listEnterCommand: StateCommand = ({ state, dispatch }) => {
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.sliceDoc(line.from, line.to);
  const listInfo = parseListItem(lineText);

  if (!listInfo) {
    return false; // 不是列表项，使用默认行为
  }

  // 如果列表项内容为空，退出列表
  if (listInfo.content.trim() === '') {
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

  // 在行尾按 Enter，创建新的列表项
  if (from === line.to) {
    let newLineText = '\n' + listInfo.indent;
    
    if (listInfo.isOrdered) {
      // 有序列表，序号加 1
      const nextNumber = (listInfo.number || 0) + 1;
      newLineText += `${nextNumber}. `;
    } else if (listInfo.marker.includes('[')) {
      // 任务列表，创建未完成的任务
      newLineText += `${listInfo.marker.split(' ')[0]} [ ] `;
    } else {
      // 无序列表
      newLineText += `${listInfo.marker} `;
    }

    if (dispatch) {
      dispatch(state.update({
        changes: { from, insert: newLineText },
        selection: { anchor: from + newLineText.length },
      }));
    }
    return true;
  }

  return false; // 在行中间，使用默认行为
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

  // 增加两个空格的缩进
  const newIndent = listInfo.indent + '  ';
  const newLine = newIndent + (listInfo.isOrdered ? '1. ' : `${listInfo.marker} `) + listInfo.content;

  if (dispatch) {
    dispatch(state.update({
      changes: { from: line.from, to: line.to, insert: newLine },
      selection: { anchor: from + 2 }, // 光标向右移动 2 个位置
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

  if (!listInfo || listInfo.indent.length < 2) {
    return false; // 不是列表项或已经在顶层
  }

  // 减少两个空格的缩进
  const newIndent = listInfo.indent.substring(2);
  const newLine = newIndent + (listInfo.isOrdered ? '1. ' : `${listInfo.marker} `) + listInfo.content;

  if (dispatch) {
    dispatch(state.update({
      changes: { from: line.from, to: line.to, insert: newLine },
      selection: { anchor: Math.max(line.from, from - 2) }, // 光标向左移动 2 个位置
    }));
  }
  return true;
};

// 智能 Backspace（在列表开头删除列表标记）
export const listBackspaceCommand: StateCommand = ({ state, dispatch }) => {
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