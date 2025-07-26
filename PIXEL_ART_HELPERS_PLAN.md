# Pixel Art Engine Enhancement Plan
## Advanced Drawing Helpers, Canvas Layers & UI Components

### Phase 1: Core Layer System 🎨

#### 1.1 Canvas Buffer Management
- **Multiple Canvas Layers**: Implement ID-based layer ordering system
  - `createLayer(id: number, zIndex?: number)`: Create new drawable layer
  - `getLayer(id: number)`: Access specific layer context
  - `setLayerOrder(layers: {id: number, zIndex: number}[])`: Reorder layers
  - `mergeLayer(sourceId: number, targetId: number)`: Combine layers
  - `deleteLayer(id: number)`: Remove layer from stack
  - `duplicateLayer(id: number, newId: number)`: Clone existing layer

#### 1.2 Layer Properties & State
- **Visibility Control**: `setLayerVisible(id: number, visible: boolean)`
- **Opacity Management**: `setLayerOpacity(id: number, alpha: 0-1)`
- **Lock/Unlock**: `setLayerLocked(id: number, locked: boolean)`
- **Layer Naming**: `setLayerName(id: number, name: string)`

#### 1.3 Global Layer Variables (Lua Exposed)
```lua
-- Current active layer
current_layer = 0

-- Layer management functions
createLayer(id, zIndex)
selectLayer(id)
getLayerCount()
getLayerInfo(id) -- returns {name, visible, opacity, locked, zIndex}
```

### Phase 2: Advanced Drawing Utilities 🖌️

#### 2.1 Enhanced Shape Drawing
- **Thick Arcs**: `drawArc(x, y, radius, startAngle, endAngle, thickness, value)`
  - Use filled circles along arc path for smooth thickness
  - Support for start/end caps (round, square, flat)
- **Rounded Rectangles**: `roundedRect(x, y, width, height, cornerRadius, value, filled)`
- **Polygons**: `polygon(points[], value, filled)` - Support for any number of sides
- **Bezier Curves**: `bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, thickness, value)`

#### 2.2 Advanced Line Drawing
- **Thick Lines with Caps**: `thickLine(x1, y1, x2, y2, thickness, value, capStyle)`
- **Dashed Lines**: `dashedLine(x1, y1, x2, y2, dashLength, gapLength, value)`
- **Anti-aliased Lines**: Optional smoothing for diagonal lines
- **Connected Path**: `beginPath()`, `lineTo()`, `closePath()`, `strokePath(thickness, value)`

#### 2.3 Pattern & Texture Tools
- **Pattern Fill**: `patternFill(x, y, width, height, pattern[])` - 2D array pattern
- **Noise Fill**: `noiseFill(x, y, width, height, seed, density, value)`
- **Gradient Tools**: Linear and radial gradients with multiple stops
- **Dithering**: `ditherFill(x, y, width, height, value1, value2, pattern)`

### Phase 3: UI Component Library 🎮

#### 3.1 Basic UI Elements
- **Buttons**: 
  - `drawButton(x, y, width, height, text, state, style)`
  - States: normal, hover, pressed, disabled
  - Styles: flat, raised, pixel-border
- **Progress Bars**:
  - `drawProgressBar(x, y, width, height, value, maxValue, style)`
  - Horizontal/vertical orientation
  - Custom fill patterns and colors
- **Sliders**:
  - `drawSlider(x, y, width, value, minValue, maxValue, style)`
  - Custom thumb and track styles

#### 3.2 Advanced UI Components
- **Text Boxes**: `drawTextBox(x, y, width, height, text, style)`
  - Word wrapping and text alignment
  - Scrollable content support
- **Menus & Dropdowns**: 
  - `drawMenu(x, y, items[], selectedIndex, style)`
  - Nested menu support
- **Panels & Windows**:
  - `drawPanel(x, y, width, height, title, style)`
  - Resizable and draggable (visual only)
  - Custom borders and backgrounds

#### 3.3 Game-Specific UI
- **Health Bars**: `drawHealthBar(x, y, width, height, currentHP, maxHP, style)`
- **Inventory Slots**: `drawInventoryGrid(x, y, cols, rows, itemSize, items[], style)`
- **Dialogue Boxes**: `drawDialogue(x, y, width, height, text, speaker, style)`
- **Mini-Maps**: `drawMiniMap(x, y, size, mapData[], playerPos, style)`

### Phase 4: Blend Modes & Compositing 🌈

#### 4.1 Basic Blend Modes
- **Multiply**: Darker blending for shadows
- **Screen**: Lighter blending for highlights  
- **Overlay**: Contrast enhancement
- **Soft Light**: Subtle lighting effects
- **Hard Light**: Dramatic lighting

#### 4.2 Layer Blend Mode API
```lua
-- Set blend mode for active layer
setLayerBlendMode(layerId, mode)
-- Available modes: "normal", "multiply", "screen", "overlay", "soft-light", "hard-light", "difference", "exclusion"

-- Temporary blend mode for next draw operation
withBlendMode(mode, function)
```

#### 4.3 Advanced Compositing
- **Clipping Masks**: Use one layer to mask another
- **Alpha Compositing**: Fine control over transparency
- **Color Dodge/Burn**: Photographic-style adjustments

### Phase 5: Animation & Timing Helpers ⏰

#### 5.1 Frame-based Animation
- **Tweening Functions**: `lerp(a, b, t)`, `smoothstep(t)`, `easeInOut(t)`
- **Animation Curves**: Predefined easing functions
- **Frame Interpolation**: Smooth transitions between keyframes

#### 5.2 Timing Utilities
- **Delta Time**: `getDeltaTime()` - Time since last frame
- **Animation Timer**: `createTimer(duration, callback)` - Frame-accurate timing
- **Oscillators**: `sin_osc(frequency)`, `triangle_osc(frequency)` - Periodic values

### Phase 6: Utility Functions 🔧

#### 6.1 Color Utilities
- **Color Mixing**: `mixColors(color1, color2, ratio)`
- **Color Conversion**: `hsvToGrayscale(h, s, v)`, `rgbToHsv(r, g, b)`
- **Palette Tools**: `findNearestColor(targetColor, palette[])`
- **Color Ramps**: `generateColorRamp(startColor, endColor, steps)`

#### 6.2 Geometric Helpers
- **Distance Functions**: `distance(x1, y1, x2, y2)`, `manhattanDistance()`
- **Angle Calculations**: `angleTo(x1, y1, x2, y2)`, `normalizeAngle(angle)`
- **Collision Detection**: `pointInRect()`, `circleIntersect()`, `lineIntersect()`
- **Grid Utilities**: `snapToGrid(x, y, gridSize)`, `worldToGrid()`, `gridToWorld()`

#### 6.3 Image Processing
- **Flood Fill**: Smart fill with boundary detection
- **Edge Detection**: Find shape outlines
- **Blur/Sharpen**: Simple convolution filters
- **Threshold**: Convert to binary image

### Implementation Priority 🚀

1. **Phase 1** (Essential): Core layer system with basic management
2. **Phase 2** (High): Enhanced drawing utilities (thick arcs, rounded rects)
3. **Phase 3** (Medium): Basic UI components (buttons, progress bars)
4. **Phase 4** (Medium): Basic blend modes (multiply, screen, overlay)
5. **Phase 5** (Low): Animation helpers and timing
6. **Phase 6** (Low): Advanced utilities and image processing

### Technical Architecture 📁

#### File Structure
```
src/services/PixelArt/
├── core/
│   ├── LayerManager.ts      # Layer system core
│   ├── BlendModes.ts        # Compositing operations
│   └── CanvasBuffer.ts      # Multi-canvas management
├── drawing/
│   ├── ShapeDrawing.ts      # Enhanced shapes & arcs
│   ├── LineDrawing.ts       # Advanced line utilities
│   └── PatternTools.ts      # Patterns & textures
├── ui/
│   ├── BasicComponents.ts   # Buttons, bars, sliders
│   ├── GameComponents.ts    # Health bars, inventories
│   └── LayoutHelpers.ts     # Panels, windows, menus
├── utils/
│   ├── ColorUtils.ts        # Color manipulation
│   ├── GeometryUtils.ts     # Math & collision helpers
│   └── AnimationUtils.ts    # Timing & tweening
└── PixelArtAPI.ts          # Lua bindings aggregator
```

#### Lua API Organization
```lua
-- Layer system
layers = {
  create = function(id, zIndex) end,
  select = function(id) end,
  setBlendMode = function(id, mode) end,
  -- ... other layer functions
}

-- Enhanced drawing
draw = {
  thickArc = function(x, y, radius, start, end, thickness, value) end,
  roundedRect = function(x, y, w, h, radius, value, filled) end,
  -- ... other drawing functions
}

-- UI components
ui = {
  button = function(x, y, w, h, text, state, style) end,
  progressBar = function(x, y, w, h, value, max, style) end,
  -- ... other UI functions
}

-- Utilities
utils = {
  color = {
    mix = function(c1, c2, ratio) end,
    -- ... color functions
  },
  geometry = {
    distance = function(x1, y1, x2, y2) end,
    -- ... geometry functions
  }
}
```

### Success Metrics 📊

- **Layer Performance**: 30+ layers at 60fps on modest hardware
- **Drawing Quality**: Smooth arcs and thick lines without artifacts
- **API Usability**: Intuitive function names and parameter ordering
- **Documentation**: Complete examples for each helper function
- **Backward Compatibility**: Existing pixel art scripts continue working

This plan provides a comprehensive roadmap for transforming the pixel art engine into a powerful, layered graphics system with professional-grade drawing tools and UI components suitable for game development and interactive applications.