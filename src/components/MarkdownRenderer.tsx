'use client';

import React from 'react';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

interface MarkdownRendererProps {
  content: string;
  preserveSyntax?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, preserveSyntax = true }) => {
  const renderMarkdownWithSyntax = (text: string) => {
    // 将 Markdown 文本转换为带有保留语法的 HTML
    const lines = text.split('\n');
    const renderedLines = lines.map((line, index) => {
      let processedLine = line;
      let className = 'markdown-line';
      
      // 标题处理
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        className += ` markdown-h${level}`;
        processedLine = `<span class="markdown-syntax">${headingMatch[1]}</span> <span class="markdown-heading-text">${headingMatch[2]}</span>`;
      }
      
      // 列表项处理
      const unorderedListMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
      if (unorderedListMatch) {
        const [, indent, marker, content] = unorderedListMatch;
        className += ' markdown-list-item markdown-ul';
        processedLine = `${indent}<span class="markdown-syntax">${marker}</span> <span class="markdown-list-content">${content}</span>`;
      }
      
      const orderedListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (orderedListMatch) {
        const [, indent, number, content] = orderedListMatch;
        className += ' markdown-list-item markdown-ol';
        processedLine = `${indent}<span class="markdown-syntax">${number}.</span> <span class="markdown-list-content">${content}</span>`;
      }
      
      // 粗体处理
      processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '<span class="markdown-syntax">**</span><strong>$1</strong><span class="markdown-syntax">**</span>');
      processedLine = processedLine.replace(/__([^_]+)__/g, '<span class="markdown-syntax">__</span><strong>$1</strong><span class="markdown-syntax">__</span>');
      
      // 斜体处理
      processedLine = processedLine.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span class="markdown-syntax">*</span><em>$1</em><span class="markdown-syntax">*</span>');
      processedLine = processedLine.replace(/(?<!_)_([^_]+)_(?!_)/g, '<span class="markdown-syntax">_</span><em>$1</em><span class="markdown-syntax">_</span>');
      
      // 行内代码处理
      processedLine = processedLine.replace(/`([^`]+)`/g, '<span class="markdown-syntax">`</span><code class="markdown-inline-code">$1</code><span class="markdown-syntax">`</span>');
      
      // 链接处理
      processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="markdown-syntax">[</span><a href="$2" class="markdown-link">$1</a><span class="markdown-syntax">]($2)</span>');
      
      // 引用块处理
      const blockquoteMatch = line.match(/^>\s+(.*)$/);
      if (blockquoteMatch) {
        className += ' markdown-blockquote';
        processedLine = `<span class="markdown-syntax">></span> <span class="markdown-quote-content">${blockquoteMatch[1]}</span>`;
      }
      
      // 分隔线处理
      if (line.match(/^(---|\*\*\*|___)$/)) {
        className += ' markdown-hr';
        processedLine = `<span class="markdown-syntax">${line}</span>`;
        return `<div class="${className}"><hr class="markdown-hr-line" /></div>`;
      }
      
      return `<div class="${className}">${processedLine}</div>`;
    });
    
    return renderedLines.join('\n');
  };
  
  const renderCodeBlocks = (html: string) => {
    // 处理代码块
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    return html.replace(codeBlockRegex, (match, lang, code) => {
      const trimmedCode = code.trim();
      return `<div class="markdown-code-block">
        <div class="markdown-code-lang"><span class="markdown-syntax">\`\`\`</span>${lang}</div>
        <pre><code class="language-${lang}">${trimmedCode}</code></pre>
        <div class="markdown-code-end"><span class="markdown-syntax">\`\`\`</span></div>
      </div>`;
    });
  };
  
  if (preserveSyntax) {
    let processedContent = renderMarkdownWithSyntax(content);
    processedContent = renderCodeBlocks(processedContent);
    
    return (
      <div 
        className="markdown-renderer preserve-syntax"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  } else {
    // 标准 Markdown 渲染（不保留语法）
    const processedContent = remark()
      .use(remarkHtml)
      .processSync(content)
      .toString();
    
    return (
      <div 
        className="markdown-renderer"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  }
};

export default MarkdownRenderer;