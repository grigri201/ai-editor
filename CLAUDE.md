# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered Markdown editor built with Next.js 15.3.4 and TypeScript. The project uses CodeMirror 6 as its editor engine, providing real-time Markdown rendering with syntax highlighting and AI assistance via OpenAI and DeepSeek APIs.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting (ESLint with Next.js Core Web Vitals)
npm run lint
```

No test commands are currently configured in this project.

## Architecture

### Core Components

1. **CodeMirrorEditor** (`src/components/CodeMirrorEditor.tsx`)
   - Main editor component using CodeMirror 6
   - Features:
     - Real-time Markdown syntax highlighting with format markers preserved
     - Custom highlight syntax: `=={+}content==` (green/added) and `=={-}content==` (red/removed)
     - Smart list handling with Tab/Shift+Tab indentation
     - Enhanced Enter and Backspace behavior for lists
     - Light theme with customized styling
   - Exposes ref methods: insertText, deleteText, getCursorPosition, setCursorPosition
   - Uses custom ViewPlugins for Markdown formatting and highlight decorations

2. **AI Integration Architecture**
   - **LLM Service** (`src/services/llm.ts`)
     - Unified interface for OpenAI and DeepSeek APIs
     - Provider switching with automatic model selection
     - Stream and non-stream response handling
     - Basic API key encryption (XOR cipher before localStorage)
     - Error handling with typed responses
   
   - **Configuration** (`src/stores/configStore.ts`)
     - Zustand store with localStorage persistence
     - Manages: API keys, provider selection, model, theme
     - Automatic model updates when switching providers
     - Models per provider defined in `PROVIDER_MODELS`

3. **Prompt Templates** (`src/prompts/`)
   - `system.ts`: System prompt template for ArticleGen agent (DIFF format)
   - `base.ts`: User prompt template with content/instruction placeholders
   - Templates are TypeScript modules exporting constants
   - DIFF format specification:
     - `@line_number` for context lines
     - `-line content` for deletions
     - `+line content` for additions
     - All responses end with `[EOF]` marker

### Supported Markdown Syntax

The editor supports the following GFM (GitHub Flavored Markdown) features:
- Headers (H1-H6)
- Bold (`**` or `__`), italic (`*` or `_`), strikethrough (`~~`)
- Ordered/unordered lists with nesting (Tab/Shift+Tab for indentation)
- Task lists (`- [ ]` and `- [x]`)
- Code blocks with language highlighting preservation
- Inline code
- Links
- Blockquotes with nesting
- Horizontal rules
- **Custom highlight syntax** (limited to two styles):
  - `=={+}text==`: Green text on light green background (for additions)
  - `=={-}text==`: Red text on light red background (for deletions)

### CodeMirror Architecture

1. **Editor Setup** (`CodeMirrorEditor.tsx`)
   - EditorState created with Markdown language support
   - Custom extensions for syntax highlighting and list handling
   - ViewPlugins for decorating Markdown syntax markers
   
2. **Markdown Extensions** (`codemirror-markdown.ts`)
   - `markdownSyntaxHighlighting`: Adds CSS classes to format markers
   - `customHighlightPlugin`: Handles `=={+}` and `=={-}` syntax
   - Decorations applied via RangeSetBuilder for performance
   
3. **Custom Commands** (`codemirror-commands.ts`)
   - `listEnterCommand`: Uses built-in `insertNewlineContinueMarkup` with empty list detection
   - `listIndentCommand/listDedentCommand`: Handle Tab/Shift+Tab for list indentation
   - `listBackspaceCommand`: Combines built-in `deleteMarkupBackward` with custom logic

### List Handling Logic

- **Tab**: Increases indent by 4 spaces (updates numbering for ordered lists)
- **Shift+Tab**: Decreases indent (recalculates numbering based on context)
- **Enter**: Creates new list item (empty item exits list)
- **Backspace** at line start: Merges with previous line

Ordered lists maintain proper numbering when indenting/dedenting based on surrounding context.

### Key Files

```
src/
├── app/
│   ├── page.tsx           # Main editor page
│   ├── settings/page.tsx  # Settings page
│   └── markdown-editor.css # Custom styles
├── components/
│   └── CodeMirrorEditor.tsx # CodeMirror 6 editor component
├── services/
│   └── llm.ts            # LLM integration service
├── stores/
│   └── configStore.ts    # Configuration state management
├── prompts/              # AI prompt templates
│   ├── system.ts         # System prompt (ArticleGen DIFF format)
│   └── base.ts           # User prompt template
├── types/
│   ├── editor.ts         # Editor TypeScript interfaces
│   └── config.ts         # Configuration types
├── constants/
│   └── editor.ts         # Editor constants, HIGHLIGHT_ALIASES for {+} and {-}
└── utils/
    ├── codemirror-markdown.ts # CodeMirror Markdown extensions
    └── codemirror-commands.ts # CodeMirror custom commands
```

### UI Layout

- **Main Editor**: 
  - Full viewport height with min-height calculation (100vh - padding - prompt bar)
  - No top navbar, clean interface
  - 90% width, max 1280px, centered
  - Placeholder: "Start writing your content, or let AI help you create in the prompt bar below..."
  
- **Prompt Bar**: 
  - Fixed at bottom, ChatGPT-style design
  - Auto-resizing textarea (1-4 lines, max 120px)
  - Send button (Enter to send, Shift+Enter for new line)
  - Menu button with settings link
  - Theme-aware styling
  
- **Settings Page**: 
  - API key input with show/hide toggle
  - Provider selection (OpenAI/DeepSeek)
  - Model selection (updates based on provider)
  - Theme switcher (light/dark)
  - Save/Clear buttons with inline feedback

## Technical Details

### TypeScript Configuration
- Target: ES2017
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` → `./src/*`

### Key Dependencies
- Next.js 15.3.4 (App Router)
- React 19.0.0
- TypeScript 5.x
- Tailwind CSS v4 (PostCSS plugin)
- Zustand 5.0.6 (state management)
- OpenAI SDK 5.8.2
- CodeMirror 6.x with @codemirror/lang-markdown

### Implementation Notes
- CodeMirror 6 handles all text editing and rendering
- Custom highlights use Decoration.mark with inline styles
- List indentation fixed at 4 spaces per level
- API keys encrypted with basic XOR cipher before localStorage
- AI responses currently log to console (TODO: integrate into editor)
- Editor uses a controlled component pattern with value/onChange props
- Custom CSS applied via EditorView.theme for consistent styling