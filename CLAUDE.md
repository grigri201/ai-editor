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

2. **AI Integration** (`src/services/llm.ts`)
   - Unified LLM service supporting OpenAI and DeepSeek
   - Template-based prompt system with placeholders
   - Features:
     - API key encryption (basic protection)
     - Provider switching (OpenAI/DeepSeek)
     - Model selection per provider
     - Stream and non-stream response support
     - Template support with `{content}`, `{instruction}`, `{language}` placeholders
     - Error handling and validation

3. **Prompt Templates** (`src/prompts/`)
   - `system.ts`: System prompt template for ArticleGen agent (DIFF format)
   - `base.ts`: User prompt template with content/instruction placeholders
   - Templates are TypeScript modules exporting constants

4. **Configuration System** (`src/stores/configStore.ts`)
   - Zustand store with localStorage persistence
   - Manages: API keys, LLM provider, model selection, theme
   - Automatic model switching when changing providers

5. **Page Layout**
   - Main editor page (`src/app/page.tsx`): Full-width editor with fixed prompt bar
   - Settings page (`src/app/settings/page.tsx`): API key and model configuration
   - ChatGPT-style prompt bar with integrated send button and menu

### File Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main editor page
│   ├── settings/page.tsx  # Settings page (previously config)
│   └── markdown-editor.css # Custom styles
├── components/
│   └── MarkdownEditor.tsx # Main editor component
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

### AI Prompt System

The LLM service uses a DIFF-based format for article editing:
- System prompt defines ArticleGen agent with DIFF format output
- User prompt template accepts `{content}`, `{instruction}`, `{language}` variables
- DIFF format uses `@` for context, `-` for deletions, `+` for additions
- All responses end with `[EOF]` marker

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
- Uses Tailwind CSS v4 with PostCSS plugin configuration
- Editor has rounded corners (border-radius: 0.75rem)
- Responsive layout: 90% width, max 1280px

### UI Layout

- **Main Editor**: 
  - Full viewport height with min-height calculation (100vh - padding - prompt bar)
  - No top navbar, clean interface
  - Editor placeholder: "Start writing your content, or let AI help you create in the prompt bar below..."
- **Prompt Bar**: 
  - Fixed at bottom, ChatGPT-style design
  - Auto-resizing textarea (1-4 lines)
  - Send button (Enter to send, Shift+Enter for new line)
  - Menu button with settings link
  - Buttons vertically centered with `top-1/2 -translate-y-1/2`
- **Settings Page**: 
  - Consistent theme with main page (light/dark mode support)
  - Back navigation to editor
  - Inline save messages instead of alerts

## Technical Details

### TypeScript Configuration
- Target: ES2017
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` → `./src/*`

### Dependencies
- Next.js 15.3.4 (with App Router)
- React 19.0.0
- TypeScript 5.x
- Tailwind CSS v4 (latest PostCSS plugin system)
- Zustand 5.0.6 (state management)
- OpenAI SDK 5.8.2

### Implementation Notes
- The editor re-renders content on every input with debouncing
- Cursor position must be saved before render and restored after
- List indentation uses 2 spaces per level
- All DOM manipulations use modern Selection/Range APIs instead of deprecated execCommand
- Code blocks require special handling as they span multiple lines
- AI responses currently log to console (TODO: integrate into editor)
- All user-facing text is in English
- Settings route is `/settings` (not `/config`)