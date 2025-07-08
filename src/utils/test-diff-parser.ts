// 测试 DIFF 解析器
import { parseDiff } from './diff-parser';

// 测试用例
const testCases = [
  {
    name: '标准格式带 EOF',
    input: `@这是一个支持 **GFM (GitHub Flavored Markdown)** 的编辑器，具有实时渲染和语法高亮功能。
-实时渲染
+即时渲染
[EOF]`,
    expected: true
  },
  {
    name: '缺少 EOF',
    input: `@这是一个支持 **GFM (GitHub Flavored Markdown)** 的编辑器，具有实时渲染和语法高亮功能。
-实时渲染
+即时渲染`,
    expected: true // 应该自动添加 EOF
  },
  {
    name: '带额外文字的响应',
    input: `我理解了，让我帮您修改：

@这是一个支持 **GFM (GitHub Flavored Markdown)** 的编辑器，具有实时渲染和语法高亮功能。
-实时渲染
+即时渲染
[EOF]

这样就把"实时渲染"改成"即时渲染"了。`,
    expected: true // 应该能提取 DIFF 部分
  },
  {
    name: '多个修改',
    input: `@# Markdown 编辑器功能展示
+
+欢迎使用 AI 增强的 Markdown 编辑器！

@这是一个支持 **GFM (GitHub Flavored Markdown)** 的编辑器，具有实时渲染和语法高亮功能。
-实时渲染
+即时渲染
[EOF]`,
    expected: true
  }
];

// 运行测试
export function testDiffParser() {
  console.log('===== DIFF 解析器测试 =====\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.name}`);
    console.log('输入:');
    console.log(testCase.input);
    console.log('\n解析结果:');
    
    const result = parseDiff(testCase.input);
    console.log(result);
    
    if (result.success === testCase.expected) {
      console.log('✅ 测试通过');
    } else {
      console.log('❌ 测试失败');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  });
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  (window as any).testDiffParser = testDiffParser;
}