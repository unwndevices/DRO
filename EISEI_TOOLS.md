# Eisei Development Tools - DROPExtensions

## Overview

These are proposed extensions to DROPthat would assist in developing Eisei, an embedded audio hardware project using Daisy Seed and ESP32.

## Proposed Tools

### 1. Cross-Platform Data Bridge

**Implementation via BLE (Bluetooth Low Energy):**

- BLE server on ESP32 for wireless communication with DRO
- Automatic control generation based on C++ parameter definitions
- Script to parse ESP32 implementation and generate web UI controls dynamically
- Bidirectional data flow:
  - **To Device**: Real-time parameter updates from web UI
  - **From Device**: Live data streaming for visualization (spectral data, envelopes, etc.)
- Benefits over WebSocket:
  - No WiFi configuration needed
  - Lower power consumption
  - Direct device-to-browser communication via Web Bluetooth API

#### Auto-Generation Workflow

1. Parse C++ headers/source for parameter definitions (using attributes or comments)
2. Generate TypeScript interfaces matching the parameter structure
3. Automatically create UI components for each parameter type
4. Establish BLE characteristics mapping to each parameter
5. Handle data serialization/deserialization for efficient BLE transmission

#### Visualization Features

- Real-time spectral analyzer showing live audio processing
- Envelope followers and modulation visualization
- Parameter history graphs
- Performance metrics (CPU usage, latency)

### 2. Lua-Powered Pixel Art Generator

**Canvas Specifications:**

- 127x127 pixel maximum canvas (matching Eisei's OLED display)
- 16-level grayscale palette
- Yellow-tinted rendering to match Eisei's UI aesthetic
- Real-time preview with zoom/pan controls

**Lua API Features:**

- `setPixel(x, y, value)` - Set pixel with grayscale value (0-15)
- `getPixel(x, y)` - Read pixel value
- `line(x1, y1, x2, y2, value)` - Draw lines
- `rect(x, y, w, h, value, filled)` - Draw rectangles
- `circle(cx, cy, r, value, filled)` - Draw circles
- `noise(x, y, scale)` - Perlin noise for procedural patterns
- `dither(x, y, value)` - Dithering patterns
- Frame-based animation support with `f` (frame) variable

**Export Options:**

- Binary format for Eisei's display (.ui files)
- C++ header with byte arrays
- PNG export for documentation
- Animation as frame sequence

**Use Cases:**

- Design UI elements and icons for Eisei's interface
- Create boot screens and logos
- Generate procedural textures and patterns
- Prototype animations for the OLED display

**Example Lua Script:**

```lua
-- Animated spiral pattern
for y = 0, 126 do
  for x = 0, 126 do
    local dx = x - 63
    local dy = y - 63
    local dist = math.sqrt(dx*dx + dy*dy)
    local angle = math.atan2(dy, dx)
    local spiral = (angle + dist * 0.1 + f * 0.1) % (math.pi * 2)
    local value = math.floor((math.sin(spiral) + 1) * 7.5)
    setPixel(x, y, value)
  end
end
```

## Technical Considerations

- Use Web Bluetooth API for browser-to-ESP32 communication
- Implement efficient binary protocols for real-time data transfer
- Consider BLE packet size limitations (20-512 bytes)
- Design for graceful degradation when BLE is unavailable
- Cache parameter definitions to avoid repeated parsing
- Canvas rendering via Canvas API with custom shader for yellow tinting
- Efficient pixel buffer management for real-time updates
