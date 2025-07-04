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

2. **MarkdownRenderer** (`src/components/MarkdownRenderer.tsx`)
   - Handles Markdown-to-HTML conversion while preserving syntax
   - Renders Markdown syntax elements in gray while applying styles
   - Not currently used by MarkdownEditor (which has its own rendering)

### Key Implementation Details

- Uses contentEditable instead of textarea for direct manipulation
- Cursor position is calculated based on plain text offsets
- Rendering preserves Markdown syntax as gray text (e.g., `**` for bold)
- HTML is escaped before processing to prevent XSS
- Chinese input is handled via composition events

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