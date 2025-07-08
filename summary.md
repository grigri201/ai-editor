# AI-Powered Markdown Editor 功能总结

## 项目概述

### 项目定位
这是一个基于 Next.js 和 TypeScript 开发的 AI 增强型 Markdown 编辑器。它提供实时 Markdown 渲染的同时保留语法可见性，并集成了 OpenAI 和 DeepSeek 的 AI 能力，帮助用户进行智能化的文章创作和编辑。

### 技术栈
- **前端框架**: Next.js 15.3.4 (App Router)
- **UI 库**: React 19.0.0
- **开发语言**: TypeScript 5.x (严格模式)
- **样式方案**: Tailwind CSS v4 (PostCSS 插件)
- **状态管理**: Zustand 5.0.6
- **编辑器引擎**: CodeMirror 6.x
- **AI 集成**: OpenAI SDK 5.8.2
- **构建工具**: Turbopack (开发环境)

### 架构设计理念
- **模块化设计**: 清晰的功能模块划分，便于维护和扩展
- **类型安全**: 全面的 TypeScript 类型定义，确保代码健壮性
- **用户体验优先**: 简洁的界面设计，流畅的编辑体验
- **可扩展性**: 统一的接口设计，易于添加新功能

## 核心功能模块

### 1. Markdown 编辑器

#### 基于 CodeMirror 6 的实现
- **高性能编辑**: 利用 CodeMirror 6 的虚拟滚动和增量更新
- **完整的编辑功能**: 撤销/重做、查找替换、括号匹配等
- **自定义语法高亮**: 通过 ViewPlugin 和 Decoration 实现

#### 支持的 Markdown 语法
**基础语法**:
- 标题: `# H1` 到 `###### H6`
- 文本样式: `**粗体**`、`*斜体*`、`~~删除线~~`
- 代码: `` `行内代码` `` 和 ` ```代码块``` `
- 链接: `[文本](URL)`
- 引用: `> 引用内容`
- 分隔线: `---`、`***`、`___`

**列表功能**:
- 无序列表: `- `、`* `、`+ `
- 有序列表: `1. `、`2. `等
- 任务列表: `- [ ]` 未完成、`- [x]` 已完成
- 支持多级嵌套（使用 4 个空格缩进）

**自定义高亮语法**:
- 基础语法: `==高亮文本==`
- 预设样式: `=={yellow}文本==`、`=={red}文本==`等
- GitHub 风格: `=={+}新增内容==`、`=={-}删除内容==`
- 自定义样式: `=={bg:#ff0000,color:#ffffff}自定义样式==`

#### 键盘快捷键
- `Tab`: 增加列表缩进/代码缩进
- `Shift+Tab`: 减少列表缩进
- `Enter`: 智能列表续行（空项退出列表）
- `Backspace`: 在行首删除列表标记
- 标准编辑快捷键: Ctrl/Cmd+Z (撤销)、Ctrl/Cmd+Y (重做)等

### 2. AI 集成功能

#### 支持的 AI 提供商
- **OpenAI**: GPT-4、GPT-4 Turbo、GPT-3.5 Turbo
- **DeepSeek**: DeepSeek Chat、DeepSeek Reasoner

#### ArticleGen 智能助手
- **角色定位**: 专业的文章生成和编辑助手
- **响应格式**: 使用 DIFF 格式精确定位修改
  ```
  @10-15  // 定位到第10-15行
  -原内容  // 删除这行
  +新内容  // 添加这行
  [EOF]    // 响应结束标记
  ```
- **多语言支持**: 根据 language 参数返回对应语言内容

#### 交互设计
- **ChatGPT 风格输入框**: 固定在底部，自适应高度
- **快捷键**: Enter 发送，Shift+Enter 换行
- **视觉反馈**: 加载动画、错误提示
- **配置检查**: 自动检测 API 配置完整性

### 3. 配置管理系统

#### 持久化存储
- 使用 Zustand + localStorage 管理状态
- API 密钥使用 Base64 编码存储
- 自动保存用户配置

#### 配置项
- API 密钥管理
- AI 提供商选择
- 模型选择（根据提供商动态更新）
- 主题设置（预留）

#### 设置页面
- 直观的配置界面
- API 密钥显示/隐藏切换
- 配置预览卡片
- 操作反馈提示

### 4. UI/UX 设计

#### 设计原则
- **极简主义**: 无多余装饰，专注内容创作
- **响应式布局**: 适配不同屏幕尺寸
- **视觉层次**: 通过颜色、大小建立清晰层次
- **一致性**: 统一的设计语言

#### 布局结构
- **主编辑区**: 90% 宽度，最大 1280px，居中显示
- **底部输入栏**: 固定定位，ChatGPT 风格
- **无顶部导航**: 最大化编辑空间

#### 视觉效果
- **语法保留显示**: Markdown 标记灰色半透明
- **代码高亮**: 代码块背景区分
- **交互反馈**: 悬停效果、焦点状态
- **动画过渡**: 平滑的状态切换

## 技术实现细节

### 编辑器核心架构

#### CodeMirror 集成
```typescript
// 核心扩展配置
const extensions = [
  markdown(),              // Markdown 语言支持
  syntaxHighlighting(),    // 语法高亮
  customMarkdownPlugin(),  // 自定义渲染
  keymap.of(customKeymap), // 自定义快捷键
  // ... 其他扩展
];
```

#### 自定义 Markdown 渲染
- 使用 ViewPlugin 创建装饰器
- 遍历语法树识别 Markdown 元素
- 应用相应的样式类
- 保留原始语法标记的可见性

### AI 服务架构

#### 统一的 LLM 接口
```typescript
interface LLMService {
  complete(params: {
    content: string;
    instruction: string;
    stream?: boolean;
  }): Promise<Response>;
}
```

#### 提示词模板系统
- **系统提示词**: 定义 AI 角色和响应格式
- **用户提示词**: 包含内容和指令的模板
- **变量替换**: `{content}`、`{instruction}`、`{language}`

### 状态管理

#### Zustand Store 设计
```typescript
interface ConfigState {
  apiKey: string;
  provider: LLMProvider;
  model: string;
  // 操作方法
  setApiKey: (key: string) => void;
  setProvider: (provider: LLMProvider) => void;
  setModel: (model: string) => void;
}
```

#### 持久化策略
- 使用 persist 中间件
- 解决 Next.js hydration 问题
- 自动同步到 localStorage

### 样式系统

#### Tailwind CSS v4 配置
- 使用 PostCSS 插件方式
- 自定义颜色主题
- 响应式工具类
- 组件化样式

## 目录结构和文件说明

```
ai-editor/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx             # 主编辑器页面
│   │   ├── settings/            # 设置页面
│   │   │   └── page.tsx
│   │   ├── layout.tsx           # 根布局
│   │   ├── globals.css          # 全局样式
│   │   └── markdown-editor.css  # 编辑器样式
│   │
│   ├── components/              # React 组件
│   │   └── CodeMirrorEditor.tsx # CodeMirror 编辑器组件
│   │
│   ├── services/                # 服务层
│   │   └── llm.ts              # AI 服务实现
│   │
│   ├── stores/                  # 状态管理
│   │   └── configStore.ts      # 配置状态
│   │
│   ├── prompts/                 # AI 提示词
│   │   ├── system.ts           # 系统提示词
│   │   └── base.ts             # 用户提示词模板
│   │
│   ├── types/                   # TypeScript 类型
│   │   ├── config.ts           # 配置相关类型
│   │   └── editor.ts           # 编辑器相关类型
│   │
│   ├── constants/               # 常量定义
│   │   └── editor.ts           # 编辑器常量
│   │
│   └── utils/                   # 工具函数
│       ├── codemirror-markdown.ts  # Markdown 扩展
│       └── codemirror-commands.ts  # 自定义命令
│
├── public/                      # 静态资源
├── package.json                 # 项目配置
├── tsconfig.json               # TypeScript 配置
├── next.config.ts              # Next.js 配置
├── postcss.config.mjs          # PostCSS 配置
└── CLAUDE.md                   # AI 助手指南
```

### 关键文件功能说明

- **page.tsx**: 应用主入口，组装编辑器和 AI 功能
- **CodeMirrorEditor.tsx**: 编辑器核心组件，处理所有编辑逻辑
- **llm.ts**: AI 服务抽象，统一不同提供商的接口
- **configStore.ts**: 全局配置管理，处理持久化
- **codemirror-markdown.ts**: 自定义 Markdown 渲染逻辑

## 开发和部署

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器

### 开发命令
```bash
# 安装依赖
npm install

# 启动开发服务器 (使用 Turbopack)
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

### 环境变量
目前项目不需要环境变量，API 密钥通过用户界面配置并存储在浏览器中。

### 构建优化
- 使用 Turbopack 加速开发构建
- 代码分割和懒加载
- 图片和字体优化
- CSS 压缩

## API 和接口

### 编辑器 API

```typescript
interface MarkdownEditorRef {
  insertText: (text: string) => void;
  deleteText: (length: number) => void;
  getCursorPosition: () => number;
  setCursorPosition: (position: number) => void;
}
```

### AI 服务接口

```typescript
interface LLMCompleteParams {
  content: string;       // 当前文档内容
  instruction: string;   // 用户指令
  language?: string;     // 响应语言
  stream?: boolean;      // 是否流式响应
}
```

### 配置管理接口

```typescript
interface ConfigStore {
  // 状态
  apiKey: string;
  provider: 'openai' | 'deepseek';
  model: string;
  
  // 操作
  setApiKey: (key: string) => void;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  clearConfig: () => void;
}
```

## 待实现功能

### 高优先级
1. **AI 响应集成**: 将 AI 的 DIFF 格式响应应用到编辑器
2. **错误处理**: 完善的错误提示和重试机制
3. **历史记录**: AI 对话历史管理
4. **导出功能**: 支持导出为 PDF、HTML 等格式

### 中优先级
1. **暗色主题**: 完整的暗色模式支持
2. **文件管理**: 本地文件的打开和保存
3. **协作功能**: 实时协作编辑
4. **插件系统**: 支持自定义插件扩展

### 低优先级
1. **更多 AI 提供商**: 支持 Anthropic、Google 等
2. **语音输入**: 语音转文字功能
3. **版本控制**: Git 集成
4. **移动端优化**: 专门的移动端界面

## 总结

这个 AI-Powered Markdown Editor 是一个设计精良、架构清晰的现代 Web 应用。它成功地将强大的编辑功能与 AI 能力结合，为用户提供了智能化的写作体验。项目采用了当前最先进的前端技术栈，代码组织合理，具有良好的可维护性和扩展性。

通过这份总结，您可以快速了解整个应用的功能架构，并以此为基础进行重构或功能扩展。项目的模块化设计使得各个功能组件可以独立开发和测试，便于团队协作和迭代开发。