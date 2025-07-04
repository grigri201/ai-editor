import { CSS_CLASSES, MARKDOWN_PATTERNS } from '@/constants/editor';

// 转义 HTML 特殊字符
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 处理粗体语法
export function processBold(text: string): string {
  return text
    .replace(MARKDOWN_PATTERNS.BOLD_ASTERISK, `<span class="${CSS_CLASSES.SYNTAX}">**</span><strong>$1</strong><span class="${CSS_CLASSES.SYNTAX}">**</span>`)
    .replace(MARKDOWN_PATTERNS.BOLD_UNDERSCORE, `<span class="${CSS_CLASSES.SYNTAX}">__</span><strong>$1</strong><span class="${CSS_CLASSES.SYNTAX}">__</span>`);
}

// 处理斜体语法
export function processItalic(text: string): string {
  return text
    .replace(MARKDOWN_PATTERNS.ITALIC_ASTERISK, `<span class="${CSS_CLASSES.SYNTAX}">*</span><em>$1</em><span class="${CSS_CLASSES.SYNTAX}">*</span>`)
    .replace(MARKDOWN_PATTERNS.ITALIC_UNDERSCORE, `<span class="${CSS_CLASSES.SYNTAX}">_</span><em>$1</em><span class="${CSS_CLASSES.SYNTAX}">_</span>`);
}

// 处理行内代码语法
export function processInlineCode(text: string): string {
  return text.replace(MARKDOWN_PATTERNS.INLINE_CODE, `<span class="${CSS_CLASSES.SYNTAX}">\`</span><code class="${CSS_CLASSES.INLINE_CODE}">$1</code><span class="${CSS_CLASSES.SYNTAX}">\`</span>`);
}

// 处理链接语法
export function processLink(text: string): string {
  return text.replace(MARKDOWN_PATTERNS.LINK, `<span class="${CSS_CLASSES.SYNTAX}">[</span><a href="$2" class="${CSS_CLASSES.LINK}">$1</a><span class="${CSS_CLASSES.SYNTAX}">]($2)</span>`);
}

// 处理删除线语法
export function processStrikethrough(text: string): string {
  return text.replace(MARKDOWN_PATTERNS.STRIKETHROUGH, `<span class="${CSS_CLASSES.SYNTAX}">~~</span><del>$1</del><span class="${CSS_CLASSES.SYNTAX}">~~</span>`);
}

// 处理所有内联语法
export function processInlineSyntax(text: string): string {
  return processStrikethrough(processLink(processInlineCode(processItalic(processBold(text)))));
}

// 渲染单行 Markdown
export function renderMarkdownLine(line: string, lineIndex: number): string {
  let processedLine = escapeHtml(line);
  
  // 检查标题
  const headingMatch = line.match(MARKDOWN_PATTERNS.HEADING);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const headingContent = processInlineSyntax(escapeHtml(headingMatch[2]));
    const headingClass = CSS_CLASSES.HEADING[`H${level}` as keyof typeof CSS_CLASSES.HEADING];
    processedLine = `<span class="${CSS_CLASSES.SYNTAX}">${headingMatch[1]}</span> <span class="${headingClass}">${headingContent}</span>`;
  } else {
    // 非标题行的处理
    processedLine = processInlineSyntax(processedLine);
    
    // 检查任务列表（未选中）
    const taskUncheckedMatch = line.match(MARKDOWN_PATTERNS.TASK_LIST_UNCHECKED);
    if (taskUncheckedMatch) {
      const [, indent, marker, content] = taskUncheckedMatch;
      const processedContent = processInlineSyntax(escapeHtml(content));
      processedLine = `${indent}<span class="${CSS_CLASSES.SYNTAX}">${marker} [ ]</span> <span class="${CSS_CLASSES.LIST_CONTENT}">${processedContent}</span>`;
    }
    
    // 检查任务列表（已选中）
    const taskCheckedMatch = line.match(MARKDOWN_PATTERNS.TASK_LIST_CHECKED);
    if (taskCheckedMatch) {
      const [, indent, marker, content] = taskCheckedMatch;
      const processedContent = processInlineSyntax(escapeHtml(content));
      processedLine = `${indent}<span class="${CSS_CLASSES.SYNTAX}">${marker} [x]</span> <span class="${CSS_CLASSES.LIST_CONTENT}">${processedContent}</span>`;
    }
    
    // 检查无序列表（如果不是任务列表）
    if (!taskUncheckedMatch && !taskCheckedMatch) {
      const unorderedListMatch = line.match(MARKDOWN_PATTERNS.UNORDERED_LIST);
      if (unorderedListMatch) {
        const [, indent, marker, content] = unorderedListMatch;
        const processedContent = processInlineSyntax(escapeHtml(content));
        processedLine = `${indent}<span class="${CSS_CLASSES.SYNTAX}">${marker}</span> <span class="${CSS_CLASSES.LIST_CONTENT}">${processedContent}</span>`;
      }
    }
    
    // 检查有序列表
    const orderedListMatch = line.match(MARKDOWN_PATTERNS.ORDERED_LIST);
    if (orderedListMatch) {
      const [, indent, number, content] = orderedListMatch;
      const processedContent = processInlineSyntax(escapeHtml(content));
      processedLine = `${indent}<span class="${CSS_CLASSES.SYNTAX}">${number}.</span> <span class="${CSS_CLASSES.LIST_CONTENT}">${processedContent}</span>`;
    }
    
    // 检查引用块
    const blockquoteMatch = line.match(MARKDOWN_PATTERNS.BLOCKQUOTE);
    if (blockquoteMatch) {
      const quoteMarkers = blockquoteMatch[1];
      const content = processInlineSyntax(escapeHtml(blockquoteMatch[2]));
      const level = quoteMarkers.length;
      let blockquoteHtml = '';
      
      // 根据引用级别添加嵌套的样式
      for (let i = 0; i < level; i++) {
        blockquoteHtml += `<div class="${CSS_CLASSES.BLOCKQUOTE}" style="margin-left: ${i * 20}px;">`;
      }
      
      blockquoteHtml += `<span class="${CSS_CLASSES.SYNTAX}">${quoteMarkers}</span> <span class="${CSS_CLASSES.QUOTE_CONTENT}">${content}</span>`;
      
      for (let i = 0; i < level; i++) {
        blockquoteHtml += '</div>';
      }
      
      processedLine = blockquoteHtml;
    }
    
    // 检查分隔线
    if (line.match(MARKDOWN_PATTERNS.HORIZONTAL_RULE)) {
      processedLine = `<span class="${CSS_CLASSES.SYNTAX}">${line}</span>`;
      return `<div class="${CSS_CLASSES.LINE} ${CSS_CLASSES.HR}" data-line="${lineIndex}"><hr class="${CSS_CLASSES.HR_LINE}" /></div>`;
    }
  }
  
  return `<div class="${CSS_CLASSES.LINE}" data-line="${lineIndex}">${processedLine || '<br>'}</div>`;
}

// 渲染完整的 Markdown 内容
export function renderMarkdownContent(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let codeBlockStartIndex = 0;

  lines.forEach((line, index) => {
    // 检查代码块标记
    const codeBlockMatch = line.match(/^```(\w*)?$/);
    
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        // 开始代码块
        inCodeBlock = true;
        codeBlockLang = codeBlockMatch[1] || '';
        codeBlockStartIndex = index;
        codeBlockContent = [];
      } else {
        // 结束代码块
        inCodeBlock = false;
        
        // 渲染整个代码块
        let codeBlockHtml = `<div class="${CSS_CLASSES.LINE}" data-line="${codeBlockStartIndex}">`;
        codeBlockHtml += `<span class="${CSS_CLASSES.SYNTAX}">\`\`\`${codeBlockLang}</span>`;
        codeBlockHtml += '</div>';
        
        // 添加代码内容
        codeBlockContent.forEach((codeLine, codeIndex) => {
          codeBlockHtml += `<div class="${CSS_CLASSES.LINE}" data-line="${codeBlockStartIndex + codeIndex + 1}">`;
          codeBlockHtml += `<span class="${CSS_CLASSES.CODE_BLOCK}">${escapeHtml(codeLine)}</span>`;
          codeBlockHtml += '</div>';
        });
        
        // 添加结束标记
        codeBlockHtml += `<div class="${CSS_CLASSES.LINE}" data-line="${index}">`;
        codeBlockHtml += `<span class="${CSS_CLASSES.SYNTAX}">\`\`\`</span>`;
        codeBlockHtml += '</div>';
        
        processedLines.push(codeBlockHtml);
      }
    } else if (inCodeBlock) {
      // 在代码块内部
      codeBlockContent.push(line);
    } else {
      // 普通行
      processedLines.push(renderMarkdownLine(line, index));
    }
  });
  
  // 如果代码块没有正确关闭，处理剩余内容
  if (inCodeBlock) {
    let codeBlockHtml = `<div class="${CSS_CLASSES.LINE}" data-line="${codeBlockStartIndex}">`;
    codeBlockHtml += `<span class="${CSS_CLASSES.SYNTAX}">\`\`\`${codeBlockLang}</span>`;
    codeBlockHtml += '</div>';
    
    codeBlockContent.forEach((codeLine, codeIndex) => {
      codeBlockHtml += `<div class="${CSS_CLASSES.LINE}" data-line="${codeBlockStartIndex + codeIndex + 1}">`;
      codeBlockHtml += `<span class="${CSS_CLASSES.CODE_BLOCK}">${escapeHtml(codeLine)}</span>`;
      codeBlockHtml += '</div>';
    });
    
    processedLines.push(codeBlockHtml);
  }
  
  return processedLines.join('');
}

// 获取纯文本内容
export function getPlainTextFromEditor(element: HTMLElement): string {
  const lines: string[] = [];
  const children = element.querySelectorAll(`.${CSS_CLASSES.LINE}`);
  
  children.forEach((child) => {
    // 检查是否只包含 <br> 标签
    if (child.innerHTML === '<br>') {
      lines.push('');
    } else {
      const text = child.textContent || '';
      lines.push(text);
    }
  });
  
  return lines.join('\n');
}