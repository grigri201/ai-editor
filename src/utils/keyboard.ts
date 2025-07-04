import { KeyboardHandlerParams, ListMatch } from '@/types/editor';
import { MARKDOWN_PATTERNS, EDITOR_CONFIG, CSS_CLASSES } from '@/constants/editor';
import { isCursorAtLineStart, isCursorAtLineEnd } from './cursor';
import { getPlainTextFromEditor } from './markdown';

// 解析列表项
function parseListItem(lineText: string): ListMatch | null {
  const unorderedMatch = lineText.match(MARKDOWN_PATTERNS.UNORDERED_LIST);
  if (unorderedMatch) {
    return {
      fullMatch: unorderedMatch[0],
      indent: unorderedMatch[1],
      marker: unorderedMatch[2],
      content: unorderedMatch[3],
      isOrdered: false,
    };
  }

  const orderedMatch = lineText.match(MARKDOWN_PATTERNS.ORDERED_LIST);
  if (orderedMatch) {
    return {
      fullMatch: orderedMatch[0],
      indent: orderedMatch[1],
      marker: orderedMatch[2],
      content: orderedMatch[3],
      isOrdered: true,
      number: orderedMatch[2],
    };
  }

  return null;
}

// 处理 Tab 键
export function handleTabKey(params: KeyboardHandlerParams): void {
  const {
    event,
    currentLine,
    lineText,
    editorElement,
    getCursorOffset,
    setCursorOffset,
    notifyChange,
    renderContent,
    handleInput,
  } = params;

  event.preventDefault();

  const listMatch = parseListItem(lineText);

  if (listMatch) {
    // 在列表中，处理缩进
    const currentIndent = listMatch.indent;
    const lines = getPlainTextFromEditor(editorElement).split('\n');
    const lineIndex = Array.from(editorElement.querySelectorAll(`.${CSS_CLASSES.LINE}`)).indexOf(currentLine);

    if (event.shiftKey) {
      // Shift+Tab: 减少缩进
      if (currentIndent.length >= EDITOR_CONFIG.LIST_INDENT_SIZE) {
        const cursorOffset = getCursorOffset();
        
        // 计算光标在行内的位置
        let lineStartOffset = 0;
        for (let i = 0; i < lineIndex; i++) {
          lineStartOffset += lines[i].length + 1;
        }
        const positionInLine = cursorOffset - lineStartOffset;
        
        const newIndent = currentIndent.substring(EDITOR_CONFIG.LIST_INDENT_SIZE);
        let newLine;
        
        if (listMatch.isOrdered) {
          // 对于有序列表，需要根据上下文调整序号
          if (newIndent.length === 0) {
            // 返回到顶层，需要找到合适的序号
            let newNumber = 1;
            // 向上查找同级别的最后一个有序列表项
            for (let i = lineIndex - 1; i >= 0; i--) {
              const prevLine = lines[i];
              const prevMatch = prevLine.match(/^(\d+)\.\s/);
              if (prevMatch) {
                newNumber = parseInt(prevMatch[1]) + 1;
                break;
              }
              // 如果遇到非列表项，停止查找
              if (!prevLine.match(/^\s*[-*+\d]+[\.\s]/)) {
                break;
              }
            }
            newLine = `${newNumber}. ${listMatch.content}`;
          } else {
            // 仍然是子列表，保持原序号
            newLine = `${newIndent}${listMatch.number}. ${listMatch.content}`;
          }
        } else {
          // 无序列表，保持原样
          newLine = `${newIndent}${listMatch.marker} ${listMatch.content}`;
        }
        
        // 更新整行内容
        lines[lineIndex] = newLine;
        
        const newContent = lines.join('\n');
        notifyChange(newContent);
        renderContent(newContent);
        
        // 调整光标位置
        requestAnimationFrame(() => {
          let newPosition;
          if (positionInLine <= currentIndent.length) {
            // 光标在缩进部分，移到新缩进末尾
            newPosition = lineStartOffset + newIndent.length;
          } else {
            // 光标在内容部分，保持相对位置
            newPosition = lineStartOffset + positionInLine - EDITOR_CONFIG.LIST_INDENT_SIZE;
          }
          setCursorOffset(Math.max(lineStartOffset, newPosition));
        });
      }
    } else {
      // Tab: 增加缩进
      const newIndent = currentIndent + ' '.repeat(EDITOR_CONFIG.LIST_INDENT_SIZE);
      let newLine;
      
      if (listMatch.isOrdered) {
        // 对于有序列表，子列表从 1 开始
        let newNumber = 1;
        
        // 向上查找相同缩进级别的最后一个有序列表项
        for (let i = lineIndex - 1; i >= 0; i--) {
          const prevLine = lines[i];
          const prevMatch = prevLine.match(MARKDOWN_PATTERNS.ORDERED_LIST);
          if (prevMatch && prevMatch[1].length === newIndent.length) {
            // 找到同级别的有序列表项
            newNumber = parseInt(prevMatch[2]) + 1;
            break;
          } else if (prevMatch && prevMatch[1].length < newIndent.length) {
            // 遇到上一级列表，说明这是新的子列表级别
            break;
          }
        }
        
        newLine = `${newIndent}${newNumber}. ${listMatch.content}`;
      } else {
        // 无序列表，保持原标记
        newLine = `${newIndent}${listMatch.marker} ${listMatch.content}`;
      }
      
      // 更新整行内容
      lines[lineIndex] = newLine;
      
      const cursorOffset = getCursorOffset();
      const newContent = lines.join('\n');
      notifyChange(newContent);
      renderContent(newContent);
      
      // 调整光标位置（增加缩进空格数）
      requestAnimationFrame(() => {
        setCursorOffset(cursorOffset + EDITOR_CONFIG.LIST_INDENT_SIZE);
      });
    }
  } else {
    // 不在列表中，插入制表符
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode('\t');
    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleInput();
  }
}

// 处理 Enter 键
export function handleEnterKey(params: KeyboardHandlerParams): void {
  const {
    event,
    currentLine,
    lineText,
    editorElement,
    getCursorOffset,
    setCursorOffset,
    notifyChange,
    renderContent,
  } = params;

  event.preventDefault();

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const currentOffset = getCursorOffset();
  
  // 获取当前行在整个文本中的位置
  const lines = getPlainTextFromEditor(editorElement).split('\n');
  const lineIndex = Array.from(editorElement.querySelectorAll(`.${CSS_CLASSES.LINE}`)).indexOf(currentLine);
  
  // 计算在当前行内的位置
  let lineStartOffset = 0;
  for (let i = 0; i < lineIndex; i++) {
    lineStartOffset += lines[i].length + 1;
  }
  
  // 检查光标是否在行尾
  const isAtEnd = isCursorAtLineEnd(range, currentLine);
  
  // 检查是否是列表项
  const listMatch = parseListItem(lineText);
  
  let newLineContent = '\n';
  
  if (listMatch) {
    const restOfLine = lineText.substring(listMatch.fullMatch.length);
    
    if (restOfLine.trim() === '') {
      // 空列表项，移除当前行的列表标记
      lines[lineIndex] = '';
      lines.splice(lineIndex + 1, 0, '');
      const newContent = lines.join('\n');
      notifyChange(newContent);
      renderContent(newContent);
      
      // 光标移到新的空行
      requestAnimationFrame(() => {
        setCursorOffset(lineStartOffset);
      });
      return;
    } else if (isAtEnd) {
      // 在行尾，创建新列表项
      if (listMatch.isOrdered) {
        const nextNumber = parseInt(listMatch.number!) + 1;
        newLineContent = `\n${listMatch.indent}${nextNumber}. `;
      } else {
        newLineContent = `\n${listMatch.indent}${listMatch.marker} `;
      }
    }
  }
  
  const positionInLine = currentOffset - lineStartOffset;
  
  // 插入新行内容
  const beforeCursor = lineText.substring(0, positionInLine);
  const afterCursor = lineText.substring(positionInLine);
  
  lines[lineIndex] = beforeCursor;
  lines.splice(lineIndex + 1, 0, afterCursor);
  
  // 如果需要添加列表前缀，将它添加到新行
  if (newLineContent.length > 1) {
    lines[lineIndex + 1] = newLineContent.substring(1) + lines[lineIndex + 1];
  }
  
  const newContent = lines.join('\n');
  notifyChange(newContent);
  renderContent(newContent);
  
  // 计算新的光标位置
  const newCursorPosition = lineStartOffset + beforeCursor.length + 1 + (newLineContent.length > 1 ? newLineContent.length - 1 : 0);
  
  // 设置光标位置
  requestAnimationFrame(() => {
    setCursorOffset(newCursorPosition);
  });
}

// 处理 Backspace 键
export function handleBackspaceKey(params: KeyboardHandlerParams): void {
  const {
    event,
    currentLine,
    editorElement,
    getCursorOffset,
    setCursorOffset,
    notifyChange,
    renderContent,
  } = params;

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  // 检查光标是否在行首
  if (isCursorAtLineStart(range, currentLine)) {
    event.preventDefault();
    
    // 获取所有行
    const lines = editorElement.querySelectorAll(`.${CSS_CLASSES.LINE}`);
    const lineIndex = Array.from(lines).indexOf(currentLine);
    
    if (lineIndex > 0) {
      // 有上一行，合并到上一行
      const prevLine = lines[lineIndex - 1];
      const prevLineLength = (prevLine.textContent || '').length;
      
      // 获取纯文本内容
      const textLines = getPlainTextFromEditor(editorElement).split('\n');
      
      // 合并行
      textLines[lineIndex - 1] += textLines[lineIndex];
      textLines.splice(lineIndex, 1);
      
      const newContent = textLines.join('\n');
      notifyChange(newContent);
      renderContent(newContent);
      
      // 设置光标到上一行末尾
      requestAnimationFrame(() => {
        // 计算上一行末尾的偏移量
        let offset = 0;
        for (let i = 0; i < lineIndex - 1; i++) {
          offset += textLines[i].length + 1;
        }
        // 加上上一行原本的长度（合并前）
        offset += prevLineLength;
        setCursorOffset(offset);
      });
    }
  }
}