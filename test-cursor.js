// 光标位置测试脚本
// 在浏览器控制台中运行此脚本来测试光标位置

// 1. 监听选择变化并记录光标位置
let cursorLog = [];
let isLogging = true;

const logCursorPosition = () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const position = {
      time: new Date().toISOString(),
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      containerText: range.startContainer.textContent,
      containerType: range.startContainer.nodeType === Node.TEXT_NODE ? 'TEXT' : 'ELEMENT',
      parentElement: range.startContainer.parentElement?.className || 'none'
    };
    
    cursorLog.push(position);
    console.log('Cursor position:', position);
    
    // 计算实际的文本偏移量
    const editor = document.querySelector('.markdown-editor-content');
    if (editor) {
      let offset = 0;
      let found = false;
      
      const lines = editor.querySelectorAll('.markdown-line');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.contains(range.startContainer)) {
          const lineRange = document.createRange();
          lineRange.selectNodeContents(line);
          lineRange.setEnd(range.startContainer, range.startOffset);
          offset += lineRange.toString().length;
          found = true;
          break;
        } else {
          offset += (line.textContent || '').length + 1; // +1 for newline
        }
      }
      
      console.log('Calculated text offset:', offset);
    }
  }
};

// 开始监听
document.addEventListener('selectionchange', logCursorPosition);

// 2. 测试函数：输入文本并检查光标
const testInput = async (text, delay = 100) => {
  console.log(`\n=== Testing input: "${text}" ===`);
  const editor = document.querySelector('.markdown-editor-content');
  if (!editor) {
    console.error('Editor not found!');
    return;
  }
  
  editor.focus();
  
  for (let char of text) {
    // 插入字符
    document.execCommand('insertText', false, char);
    
    // 等待渲染
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 记录光标位置
    logCursorPosition();
  }
};

// 3. 测试 Markdown 语法
const runTests = async () => {
  console.log('Starting cursor position tests...');
  
  // 清空编辑器
  const editor = document.querySelector('.markdown-editor-content');
  if (editor) {
    editor.focus();
    document.execCommand('selectAll');
    document.execCommand('delete');
  }
  
  // 测试普通文本
  await testInput('Hello World', 200);
  
  // 测试粗体
  await testInput('\n**bold text**', 200);
  
  // 测试斜体
  await testInput('\n*italic*', 200);
  
  // 测试标题
  await testInput('\n# Title', 200);
  
  // 测试列表
  await testInput('\n- List item', 200);
  
  console.log('\n=== Test complete ===');
  console.log('Total cursor positions logged:', cursorLog.length);
  console.log('Cursor log:', cursorLog);
};

// 4. 分析光标跳动
const analyzeCursorJumps = () => {
  console.log('\n=== Analyzing cursor jumps ===');
  
  for (let i = 1; i < cursorLog.length; i++) {
    const prev = cursorLog[i - 1];
    const curr = cursorLog[i];
    
    // 检查是否有异常跳动
    if (prev.startOffset !== curr.startOffset - 1 && 
        prev.containerText !== curr.containerText) {
      console.warn('Cursor jump detected:', {
        from: prev,
        to: curr,
        jump: curr.startOffset - prev.startOffset
      });
    }
  }
};

// 5. 停止监听
const stopLogging = () => {
  document.removeEventListener('selectionchange', logCursorPosition);
  isLogging = false;
  console.log('Stopped logging cursor positions');
};

// 使用说明
console.log(`
===== 光标位置测试工具 =====

可用命令：
1. runTests() - 运行自动测试
2. testInput('your text') - 测试输入特定文本
3. analyzeCursorJumps() - 分析光标跳动
4. stopLogging() - 停止记录
5. cursorLog - 查看所有记录的光标位置

手动测试步骤：
1. 在编辑器中输入 "Hello"
2. 观察控制台输出的光标位置
3. 输入 "**bold**"
4. 检查是否有异常的光标跳动
5. 运行 analyzeCursorJumps() 查看分析结果
`);