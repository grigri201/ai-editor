# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Markdown editor built with Next.js 15.3.4 and TypeScript. It provides real-time Markdown rendering while preserving syntax visibility in a single-column editor.

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
   - Exposes ref methods: insertText, deleteText, getCursorPosition, setCursorPosition

2. **Markdown Utilities** (`src/utils/`)
   - `markdown.ts`: Rendering logic with support for GFM syntax
   - `cursor.ts`: Cursor position management for contentEditable
   - `keyboard.ts`: Keyboard event handlers for special keys
   - `common.ts`: Shared utilities like debounce

### File Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page with editor demo
│   └── markdown-editor.css # Custom styles
├── components/
│   └── MarkdownEditor.tsx # Main editor component
├── constants/
│   └── editor.ts          # Editor constants and regex patterns
├── types/
│   └── editor.ts          # TypeScript interfaces
└── utils/                 # Utility functions
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
- Supports dark mode
- Markdown syntax displayed with reduced opacity
- Uses Tailwind CSS v4

## Important Notes

- The editor re-renders content on every input with debouncing
- Cursor position must be saved before render and restored after
- List indentation uses 2 spaces per level
- All DOM manipulations use modern Selection/Range APIs instead of deprecated execCommand
- Code blocks require special handling as they span multiple lines
- Always output in Chinese when interacting with the codebase (per CLAUDE.local.md)