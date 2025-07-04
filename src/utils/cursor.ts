import { CSS_CLASSES } from '@/constants/editor';

// 获取光标位置（相对于纯文本）
export function getCursorOffset(editorElement: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return 0;

  const range = selection.getRangeAt(0);
  
  // 确保光标在编辑器内
  if (!editorElement || !editorElement.contains(range.startContainer)) {
    return 0;
  }
  
  let offset = 0;
  let node = editorElement.firstChild;
  let foundStart = false;

  // 遍历所有行
  while (node && !foundStart) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList?.contains(CSS_CLASSES.LINE)) {
      const lineElement = node as HTMLElement;
      
      // 检查光标是否在这一行
      if (lineElement && lineElement.contains(range.startContainer)) {
        // 计算在这一行内的偏移量
        const lineText = lineElement.textContent || '';
        
        // 如果是文本节点
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textContent = range.startContainer.textContent || '';
          const beforeText = lineElement.textContent?.substring(0, lineElement.textContent.indexOf(textContent) + range.startOffset) || '';
          offset += beforeText.length;
        } else {
          // 如果是元素节点，获取到开始位置的文本长度
          offset += lineText.length;
        }
        foundStart = true;
      } else {
        // 添加整行的长度 + 换行符
        offset += (lineElement.textContent || '').length + 1;
      }
    }
    node = node.nextSibling;
  }

  // 如果是最后一行，需要减去多余的换行符
  const lines = editorElement.querySelectorAll(`.${CSS_CLASSES.LINE}`);
  if (lines.length > 0 && range.startContainer === lines[lines.length - 1] || 
      (lines[lines.length - 1] as HTMLElement).contains(range.startContainer)) {
    offset = Math.max(0, offset - 1);
  }

  return offset;
}

// 在特定行内设置光标
export function setCursorInLine(line: HTMLElement, localOffset: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  
  // 清除现有选择
  selection.removeAllRanges();
  
  // 处理空行
  if (line.innerHTML === '<br>') {
    const range = document.createRange();
    const br = line.querySelector('br');
    if (br) {
      range.setStartBefore(br);
      range.collapse(true);
      selection.addRange(range);
    }
    return;
  }
  
  // 遍历文本节点找到正确位置
  const walker = document.createTreeWalker(
    line,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node: Node | null;
  let nodeOffset = 0;
  
  while (node = walker.nextNode()) {
    const nodeLength = node.textContent?.length || 0;
    if (nodeOffset + nodeLength >= localOffset) {
      const range = document.createRange();
      // 确保偏移量不会为负或超出范围
      const positionInNode = localOffset - nodeOffset;
      const safeOffset = Math.max(0, Math.min(positionInNode, nodeLength));
      
      try {
        range.setStart(node, safeOffset);
        range.collapse(true);
        selection.addRange(range);
      } catch (e) {
        // 如果出错，尝试设置在行末
        range.selectNodeContents(line);
        range.collapse(false);
        selection.addRange(range);
      }
      return;
    }
    nodeOffset += nodeLength;
  }
  
  // 如果没找到合适的文本节点，设置在行末
  const range = document.createRange();
  range.selectNodeContents(line);
  range.collapse(false);
  selection.addRange(range);
}

// 设置光标位置
export function setCursorOffset(editorElement: HTMLElement, offset: number): void {
  // 确保编辑器有焦点
  editorElement.focus();
  
  const lines = editorElement.querySelectorAll(`.${CSS_CLASSES.LINE}`);
  let currentOffset = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as HTMLElement;
    const lineText = line.textContent || '';
    const lineLength = lineText.length;
    const isLastLine = i === lines.length - 1;
    
    // 这一行的结束位置（包括换行符）
    const lineEndWithNewline = currentOffset + lineLength + (isLastLine ? 0 : 1);
    
    // 检查光标是否在这一行范围内
    if (offset >= currentOffset && offset <= currentOffset + lineLength) {
      // 光标在这一行内
      const localOffset = offset - currentOffset;
      setCursorInLine(line, localOffset);
      return;
    } else if (!isLastLine && offset === lineEndWithNewline) {
      // 光标正好在换行符后（下一行开头）
      currentOffset = lineEndWithNewline;
      continue;
    }
    
    currentOffset = lineEndWithNewline;
  }
}

// 检查光标是否在行首
export function isCursorAtLineStart(range: Range, line: Element): boolean {
  const lineText = line.textContent || '';
  if (lineText === '' || lineText === '\u00A0') return true;
  
  // 创建一个范围从行开始到光标位置
  const testRange = document.createRange();
  testRange.selectNodeContents(line);
  testRange.setEnd(range.startContainer, range.startOffset);
  
  const beforeCursor = testRange.toString();
  return beforeCursor === '';
}

// 检查光标是否在行尾
export function isCursorAtLineEnd(range: Range, line: Element): boolean {
  const lineText = line.textContent || '';
  if (lineText === '' || lineText === '\u00A0') return true;
  
  // 创建一个范围从光标位置到行结束
  const testRange = document.createRange();
  testRange.setStart(range.endContainer, range.endOffset);
  testRange.selectNodeContents(line);
  testRange.setStart(range.endContainer, range.endOffset);
  
  const afterCursor = testRange.toString();
  return afterCursor === '';
}