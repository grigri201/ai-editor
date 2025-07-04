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

# Run linting
npm run lint
```

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

2. **AI Integration** (`src/services/llm.ts`)
   - Unified LLM service supporting OpenAI and DeepSeek
   - Configuration management via Zustand store
   - Features:
     - API key encryption (basic protection)
     - Provider switching (OpenAI/DeepSeek)
     - Model selection per provider
     - Stream and non-stream response support
     - Error handling and validation

3. **Configuration System** (`src/stores/configStore.ts`)
   - Zustand store with localStorage persistence
   - Manages: API keys, LLM provider, model selection, theme
   - Automatic model switching when changing providers

4. **Page Layout**
   - Main editor page (`src/app/page.tsx`): Full-width editor with fixed prompt bar
   - Config page (`src/app/config/page.tsx`): API key and model configuration
   - ChatGPT-style prompt bar with integrated send button and menu

### File Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main editor page
│   ├── config/page.tsx    # Configuration page
│   └── markdown-editor.css # Custom styles
├── components/
│   └── MarkdownEditor.tsx # Main editor component
├── services/
│   └── llm.ts            # LLM integration service
├── stores/
│   └── configStore.ts    # Configuration state management
├── types/
│   ├── editor.ts         # Editor TypeScript interfaces
│   └── config.ts         # Configuration types
├── constants/
│   └── editor.ts         # Editor constants and regex patterns
└── utils/                # Utility functions
```

### Supported Markdown Syntax

The editor supports the following GFM (GitHub Flavored Markdown) features:
- Headers (H1-H6)
- Bold (`**` or `__`), italic (`*` or `_`), strikethrough (`~~`)
- Ordered/unordered lists with nesting
- Task lists (`- [ ]` and `- [x]`)
- Code blocks with language highlighting preservation
- Inline code
- Links
- Blockquotes with nesting
- Horizontal rules

### Key Implementation Details

- Uses contentEditable instead of textarea for direct manipulation
- Cursor position is calculated based on plain text offsets
- Rendering preserves Markdown syntax as gray text (e.g., `**` for bold)
- HTML is escaped before processing to prevent XSS
- Chinese input is handled via composition events
- Multi-line structures (code blocks) are handled separately from single-line rendering

### Styling

- Custom styles in `src/app/markdown-editor.css`
- Theme system with light/dark mode support
- Markdown syntax displayed with reduced opacity
- Uses Tailwind CSS v4
- Editor has rounded corners (border-radius: 0.75rem)
- Responsive layout: 90% width, max 1280px

### UI Layout

- **Main Editor**: Full viewport height, no top navbar
- **Prompt Bar**: Fixed at bottom, ChatGPT-style with:
  - Auto-resizing textarea (1-4 lines)
  - Send button (Enter to send, Shift+Enter for new line)
  - Menu button (...) for accessing configuration
- **Configuration Page**: Dark theme with API key and model selection

## Important Notes

- The editor re-renders content on every input with debouncing
- Cursor position must be saved before render and restored after
- List indentation uses 2 spaces per level
- All DOM manipulations use modern Selection/Range APIs instead of deprecated execCommand
- Code blocks require special handling as they span multiple lines
- AI responses currently log to console (TODO: integrate into editor)
- Always output in Chinese when interacting with the codebase (per CLAUDE.local.md)
- Do not start dev server, use browser-mcp to debug directly (per CLAUDE.local.md)