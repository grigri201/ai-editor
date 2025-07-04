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

// 处理所有内联语法
export function processInlineSyntax(text: string): string {
  return processLink(processInlineCode(processItalic(processBold(text))));
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
    
    // 检查无序列表
    const unorderedListMatch = line.match(MARKDOWN_PATTERNS.UNORDERED_LIST);
    if (unorderedListMatch) {
      const [, indent, marker, content] = unorderedListMatch;
      const processedContent = processInlineSyntax(escapeHtml(content));
      processedLine = `${indent}<span class="${CSS_CLASSES.SYNTAX}">${marker}</span> <span class="${CSS_CLASSES.LIST_CONTENT}">${processedContent}</span>`;
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
      const content = processInlineSyntax(escapeHtml(blockquoteMatch[1]));
      processedLine = `<span class="${CSS_CLASSES.SYNTAX}">></span> <span class="${CSS_CLASSES.QUOTE_CONTENT}">${content}</span>`;
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
  return lines.map((line, index) => renderMarkdownLine(line, index)).join('');
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