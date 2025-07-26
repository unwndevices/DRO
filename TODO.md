# TODO: DROP - Eisei Development Tools Integration

## Overview

Transform DROP into a collection of tools for Eisei Development, starting with the implementation of the tool from `/home/unwn/eisei/eisei_playground/`.

## Tasks

### Phase 1: Analysis & Planning

- [x] Create TODO.md file to track Eisei Development integration
- [x] Analyze eisei_playground tool structure and requirements
- [x] Design integration architecture for Eisei tools in DROP

### Phase 2: Implementation

- [x] Add required dependencies (@radix-ui/react-slider, lucide-react)
- [x] Create vertical navbar with tool icons
- [x] Create tools directory structure
- [x] Implement eisei_playground tools in DROP
- [x] Update App.tsx for tool navigation
- [x] Create navigation/menu system for multiple Eisei tools
- [x] Update build configuration for Eisei Development

### Phase 3: Testing & Deployment

- [x] Test integration and ensure compatibility
- [ ] Update documentation for Eisei Development context
- [ ] Configure deployment for Eisei tools collection

## Implementation Status: ✅ COMPLETED

### What's been implemented:

1. **Vertical Navigation Bar**: Left sidebar with tool icons (Datum Editor, Graphic to UI)
2. **Tool Architecture**: Modular structure with separate components for each tool
3. **UI Graphics Converter**: Full implementation of the eisei_playground functionality
4. **Spectral Analysis Tool**: Wrapped existing functionality in new tool structure
5. **Responsive Design**: Navbar adapts to different screen sizes
6. **Theme Integration**: Uses existing DROP terminal theme colors
7. **Build System**: All tools compile and run successfully

### Key Features Added:

- Tool switching with localStorage persistence
- Vertical navigation with icons from lucide-react
- UI graphics conversion with dynamic range control
- File upload and image processing
- Animation playback with configurable FPS
- C header code generation
- Binary file export (.ui format)

### Development Server Running:

- Local: http://localhost:5174/
- Build: ✅ Successful
- TypeScript: ✅ No errors
- Dependencies: ✅ All installed

## Recent Fixes Applied:

1. ✅ **Fixed gap between sidebar and content** - Removed conflicting CSS margins
2. ✅ **Moved DROP title to sidebar only** - Compact vertical layout with logo and subtitle
3. ✅ **Tool name in header** - Dynamic header showing current tool name and description
4. ✅ **Fixed UI graphics color mapping** - Corrected color palette and processing algorithm
5. ✅ **Icon-only sidebar with tooltips** - Cleaner 80px width sidebar with hover tooltips

### UI Graphics Color Palette Fixed:

- Applied correct 5-color amber gradient palette
- Fixed color mapping algorithm to match original eisei_playground
- Corrected transparency handling and dynamic range processing
- Canvas size and scaling factors match original specifications

## Architecture Considerations

- Maintain existing DROP spectral analysis functionality
- Create modular structure for adding multiple Eisei tools
- Ensure consistent UI/UX across all tools
- Preserve PWA capabilities for offline usage

## Tool Integration Strategy

1. Create a tools directory structure (`src/tools/`)
2. Each tool as a separate module with its own components
3. Shared services and utilities in `src/services/`
4. Unified navigation system for tool selection
5. Consistent theming and settings across all tools

## eisei_playground Analysis

The eisei_playground app includes two tools:

1. **UI Graphic Converter**: Converts image sequences (PNG/BMP) to UI graphics format (.ui files)

   - Processes images with color mapping to a 16-color palette
   - Supports animation with configurable FPS
   - Generates C header code for embedded use
   - Stores 2 pixels per byte (4-bit color indices)

2. **UI Graphic Preview**: Preview UI graphic files
   - Displays .ui files with proper color mapping
   - Animation playback support

### Key Dependencies to Add

- @radix-ui/react-slider
- lucide-react (icons)
- Additional UI components

## Implementation Plan

1. Create `src/tools/` directory structure
2. Adapt eisei_playground components for DROP integration
3. Create tool switching mechanism in App.tsx
4. Integrate with existing SettingsContext
5. Update routing for tool navigation
6. Ensure theme consistency
7. Add PWA manifest entries for new tools

## Notes

- Keep track of any dependencies from eisei_playground
- Ensure compatibility with existing Lua engine if needed
- Consider code reusability between tools
- Maintain performance for real-time operations
- The UI graphic format uses 4-bit color indices (16 colors max)
- Animation data is stored as sequential frames
