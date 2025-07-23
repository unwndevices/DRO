# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DRO (Datum Research Observatory) is a Progressive Web App that provides a Lua-based spectral lookup table generation and visualization tool. It allows users to write Lua scripts that generate spectral data across 20 frequency bands and multiple time frames.

## Common Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Build for GitHub Pages deployment
npm run build:gh-pages

# Lint the codebase
npm run lint

# Preview production build locally
npm run preview
```

## Architecture Overview

### Core Services

1. **LuaService** (`src/services/LuaEngine/LuaService.ts`)
   - Manages WebAssembly-based Lua runtime (wasmoon)
   - Provides code validation, linting, and execution
   - Injects global variables: `i` (frame index), `f` (frequency index), `i_amt` (total frames), `f_amt` (20 bands)
   - Contains 8 pre-built templates for spectral generation

2. **PWAService** (`src/services/PWAService.ts`)
   - Handles Progressive Web App registration
   - Manages service worker lifecycle
   - Provides offline capabilities

### Key Components Architecture

- **App.tsx**: Main component managing global state and layout
- **CodeEditor**: CodeMirror 6 integration with Lua syntax highlighting and auto-completion
- **SimpleSpectrumChart**: uplot-based visualization for 20-band spectral data
- **SettingsContext**: Global settings management with localStorage persistence

### Data Flow

1. User writes Lua script in CodeEditor
2. Script is validated by LuaService
3. On execution, LuaService generates SpectralFrame[] data
4. Data is passed to SimpleSpectrumChart for visualization
5. Settings and scripts persist via localStorage

### Important Type Definitions

- `Datum`: Main data structure containing frames and metadata
- `SpectralFrame`: 20-element array representing frequency bands
- `LuaScript`: Script storage format with code and metadata
- `Settings`: App configuration including theme and layout

### Build Configuration

The project uses Vite with special configurations:
- TypeScript strict mode enabled
- Code splitting for vendor, CodeMirror, and wasmoon chunks
- PWA plugin for service worker generation
- GitHub Pages deployment requires base path `/DRO/`

### Development Guidelines

1. **Lua Engine Modifications**: Any changes to Lua execution should maintain compatibility with existing templates
2. **Performance**: The visualization updates in real-time, so keep frame generation efficient
3. **PWA Updates**: Service worker changes require cache versioning in `vite.config.ts`
4. **Theme System**: Use CSS variables defined in `src/styles/theme.css` for consistency
5. **Error Handling**: All Lua errors should provide line numbers and clear messages

### Design Principles

- **Unified Styling System**: Use an unified styling system to maintain consistent design across components and improve maintainability