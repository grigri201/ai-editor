# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered Markdown editor built with Next.js 15.3.4 and TypeScript. It provides real-time Markdown rendering while preserving syntax visibility, with integrated AI assistance via OpenAI and DeepSeek APIs.

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

1. **MarkdownEditor** (`src/components/MarkdownEditor.tsx`)
   - Main editor component using contentEditable
   - Implements real-time Markdown rendering with syntax preservation
   - Key features:
     - Custom cursor position management (getCursorOffset/setCursorOffset)
     - Debounced rendering (100ms) for performance
     - Support for Tab/Shift+Tab list indentation
     - Smart Enter key handling for lists
     - Backspace at line start merges lines
     - Theme-aware styling (light/dark mode)
   - Exposes ref methods: insertText, deleteText, getCursorPosition, setCursorPosition

   **Alternative Implementation**: `CodeMirrorEditor.tsx` provides a CodeMirror 6-based editor with enhanced features (syntax highlighting, better performance). To switch editors, change the import in `src/app/page.tsx`

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
- **Custom highlight syntax**: `=={style}text==`
  - Predefined: `{+}` (green/added), `{-}` (red/removed), `{yellow}`, `{red}`, `{green}`, `{blue}`, `{purple}`, `{orange}`
  - Custom: `{bg:color,color:text-color}`

### Rendering Pipeline

1. User input triggers `handleInput`
2. Plain text extracted via `getPlainTextFromEditor`
3. Content debounced (100ms) before rendering
4. `renderMarkdownContent` processes entire text:
   - Splits into lines
   - Handles code blocks specially (preserves language identifier)
   - Each line processed by `renderMarkdownLine`
   - Inline syntax processed in order: bold → italic → code → link → strikethrough → highlight
5. Cursor position saved and restored after DOM update

### List Handling Logic

- **Tab**: Increases indent by 4 spaces (updates numbering for ordered lists)
- **Shift+Tab**: Decreases indent (recalculates numbering based on context)
- **Enter**: Creates new list item (empty item exits list)
- **Backspace** at line start: Merges with previous line

Ordered lists maintain proper numbering when indenting/dedenting based on surrounding context.

### File Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main editor page
│   ├── settings/page.tsx  # Settings page
│   └── markdown-editor.css # Custom styles
├── components/
│   ├── MarkdownEditor.tsx # ContentEditable editor
│   └── CodeMirrorEditor.tsx # CodeMirror 6 editor (alternative)
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
│   └── editor.ts         # Editor constants, regex patterns, highlight aliases
└── utils/
    ├── markdown.ts       # Markdown rendering functions
    ├── cursor.ts         # Cursor position management
    ├── keyboard.ts       # Keyboard event handlers
    ├── common.ts         # Common utilities (debounce)
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
- CodeMirror 6.x (optional editor)

### Implementation Notes
- List indentation uses 4 spaces per level (configured in `EDITOR_CONFIG.LIST_INDENT_SIZE`)
- All DOM manipulations use modern Selection/Range APIs
- Chinese input handled via composition events
- API keys encrypted with basic XOR cipher before localStorage
- Theme changes update both editor and UI components
- AI responses currently log to console (TODO: integrate into editor)
- All user-facing text is in English