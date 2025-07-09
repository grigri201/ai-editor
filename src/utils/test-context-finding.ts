export function testContextFinding() {
  const testContent = `# AI 智能编辑器

这是一个支持 **GFM (GitHub Flavored Markdown)** 的编辑器，具有实时渲染和语法高亮功能。

## 文本格式

- **粗体文本** 或 __粗体文本__
- *斜体文本* 或 _斜体文本_
- ~~删除线文本~~
- \`行内代码\`
- 新增的内容 和 删除的内容

## 标题层级

### 三级标题`;

  console.log('测试内容长度:', testContent.length);
  console.log('---');
  
  // 测试查找 "## "
  const context1 = "## ";
  let pos1 = testContent.indexOf(context1);
  console.log(`查找 "${context1}":`);
  console.log(`位置: ${pos1}`);
  if (pos1 !== -1) {
    console.log(`上下文后的内容: "${testContent.substring(pos1 + context1.length, pos1 + context1.length + 20)}"`);
  }
  
  // 查找所有 "## " 的位置
  console.log('\n所有 "## " 的位置:');
  let searchPos = 0;
  while (true) {
    const pos = testContent.indexOf(context1, searchPos);
    if (pos === -1) break;
    console.log(`位置 ${pos}: "${testContent.substring(pos, pos + 20).replace(/\n/g, '\\n')}"`);
    searchPos = pos + 1;
  }
  
  // 测试更长的上下文
  console.log('\n测试更长的上下文:');
  const context2 = "\n\n## ";
  const pos2 = testContent.indexOf(context2);
  console.log(`查找 "\\n\\n## ": 位置 ${pos2}`);
  if (pos2 !== -1) {
    console.log(`上下文后的内容: "${testContent.substring(pos2 + context2.length, pos2 + context2.length + 20)}"`);
  }
}

// 在浏览器控制台运行
if (typeof window !== 'undefined') {
  (window as any).testContextFinding = testContextFinding;
}