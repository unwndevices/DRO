# ESP32 Lua Interpreter Implementation Plan

## Overview

This document outlines the plan to implement a Lua interpreter for the EISEI ESP32 UI to run pixel art generation scripts directly on the device, matching the functionality currently available in the DROP web app.

## Current Architecture Analysis

### DROP Web App (Source)
- **LuaPixelService** (`src/services/PixelArt/LuaPixelService.ts`): WebAssembly-based Lua runtime using wasmoon
- **Canvas**: 127x127 grayscale pixels with 16 levels (4-bit, 0-15)
- **Global Variables**: `f` (frame index), `f_amt` (total frames), `canvas_width`, `canvas_height`
- **Graphics API**: Love2D-compatible API with `graphics.*` functions
- **Primitives API**: Direct pixel manipulation with `setPixel`, `getPixel`, `line`, `rect`, `circle`
- **Utility Functions**: `noise`, `dither`, `gradient`, `distance`

### ESP32 Target (EISEI)
- **Hardware**: ESP32-S3 with 8MB flash (LittleFS filesystem)
- **Display**: 128x128 SSD1327 OLED (16-level grayscale)
- **UI Framework**: Custom UIManager with Adafruit GFX
- **Storage**: LittleFS for persistent file storage
- **Memory**: Limited RAM compared to web environment

## Implementation Components

### 1. Lua Interpreter Core
**Technology Options:**
- **Lua 5.4** - Latest stable version, smaller footprint
- **LuaJIT** - Faster but larger, may be overkill for simple scripts
- **eLua** - Embedded Lua optimized for microcontrollers
- **Recommendation**: Start with standard Lua 5.4 compiled for ESP32

**Integration:**
```cpp
// LuaPixelEngine.hpp
class LuaPixelEngine {
    lua_State* L;
    GFXcanvas8* canvas;  // 128x128 grayscale buffer
    uint8_t currentFrame;
    uint8_t totalFrames;
    
public:
    void init();
    void loadScript(const char* filename);
    void executeFrame(uint8_t frameIndex);
    void registerAPIs();
};
```

### 2. Graphics API Mapping

Map existing Lua API to ESP32 hardware:

```cpp
// Pixel manipulation (direct to canvas buffer)
static int lua_setPixel(lua_State* L) {
    int x = luaL_checkinteger(L, 1);
    int y = luaL_checkinteger(L, 2);
    int value = luaL_checkinteger(L, 3);
    // Clamp and write to canvas->getBuffer()
}

// Drawing primitives using Adafruit GFX
static int lua_graphics_circle(lua_State* L) {
    const char* mode = luaL_checkstring(L, 1);
    int x = luaL_checkinteger(L, 2);
    int y = luaL_checkinteger(L, 3);
    int r = luaL_checkinteger(L, 4);
    // Use canvas->fillCircle() or canvas->drawCircle()
}
```

### 3. Script Storage & Management

**File Structure in LittleFS:**
```
/scripts/
  ├── default.lua      # Factory default script
  ├── user/           # User-uploaded scripts
  │   ├── script1.lua
  │   ├── script2.lua
  │   └── meta.json   # Script metadata
  └── active.lua      # Currently active script
```

**Script Metadata Format:**
```json
{
  "scripts": [
    {
      "id": "script1",
      "name": "Plasma Effect",
      "frames": 64,
      "created": 1737926400,
      "size": 2048
    }
  ],
  "active": "script1"
}
```

### 4. Script Manager Implementation

#### ESP32 Side
```cpp
class ScriptManager {
    static constexpr size_t MAX_SCRIPT_SIZE = 16384;  // 16KB limit
    static constexpr uint8_t MAX_SCRIPTS = 16;
    
public:
    bool saveScript(const char* id, const char* content);
    bool loadScript(const char* id, char* buffer, size_t bufferSize);
    bool deleteScript(const char* id);
    bool setActiveScript(const char* id);
    void listScripts(ScriptInfo* info, uint8_t maxCount);
};
```

#### Web Communication Protocol
Using existing I2C communication between ESP32 and Daisy:

```cpp
// Command structure
enum ScriptCommand : uint8_t {
    CMD_LIST_SCRIPTS = 0x40,
    CMD_GET_SCRIPT = 0x41,
    CMD_SET_SCRIPT = 0x42,
    CMD_DELETE_SCRIPT = 0x43,
    CMD_SET_ACTIVE = 0x44,
    CMD_GET_STATUS = 0x45
};

// Packet format
struct ScriptPacket {
    uint8_t command;
    uint8_t scriptId[16];
    uint16_t offset;
    uint16_t length;
    uint8_t data[240];  // I2C packet size limit
};
```

### 5. Web App Integration

#### DROP Side Additions
```typescript
// src/services/DeviceBridge/ScriptSyncService.ts
export class ScriptSyncService {
  async listDeviceScripts(): Promise<ScriptInfo[]>;
  async uploadScript(id: string, content: string): Promise<boolean>;
  async downloadScript(id: string): Promise<string>;
  async deleteScript(id: string): Promise<boolean>;
  async setActiveScript(id: string): Promise<boolean>;
  async getDeviceStatus(): Promise<DeviceScriptStatus>;
}

// UI Component
// src/tools/device-scripts/DeviceScriptManager.tsx
- List scripts on device
- Upload from current editor
- Download to editor
- Delete scripts
- Set active script
- Monitor sync status
```

### 6. Runtime Optimization

**Memory Management:**
- Pre-allocate Lua heap (64KB suggested)
- Limit stack depth to prevent overflow
- Implement script size limits
- Use integer-only math where possible

**Performance:**
- Cache compiled bytecode in LittleFS
- Limit frame rate to 30 FPS max
- Implement watchdog timer for script execution
- Profile and optimize hot paths

**Script Limitations:**
```lua
-- Enforced limits
MAX_SCRIPT_SIZE = 16384      -- 16KB source
MAX_EXECUTION_TIME = 33      -- ms per frame (30 FPS)
MAX_MEMORY_USAGE = 65536     -- 64KB heap
DISABLED_FUNCTIONS = {       -- Security
    "loadfile", "dofile", 
    "io", "os", "debug"
}
```

## Implementation Phases

### Phase 1: Core Lua Integration (Week 1-2)
- [ ] Integrate Lua 5.4 into ESP32 build
- [ ] Implement basic canvas API (setPixel, getPixel, clear)
- [ ] Create simple test scripts
- [ ] Verify memory usage and performance

### Phase 2: Graphics API (Week 2-3)
- [ ] Port all drawing primitives (line, rect, circle)
- [ ] Implement Love2D-compatible graphics.* functions
- [ ] Add utility functions (noise, gradient, etc.)
- [ ] Test with existing DROP scripts

### Phase 3: Storage & Management (Week 3-4)
- [ ] Implement ScriptManager with LittleFS
- [ ] Create script metadata system
- [ ] Add script CRUD operations
- [ ] Implement active script persistence

### Phase 4: Communication Protocol (Week 4-5)
- [ ] Design I2C packet protocol
- [ ] Implement ESP32 command handler
- [ ] Create Daisy-side relay (if needed)
- [ ] Test end-to-end communication

### Phase 5: Web Integration (Week 5-6)
- [ ] Create ScriptSyncService in DROP
- [ ] Build DeviceScriptManager UI
- [ ] Implement upload/download flows
- [ ] Add progress indicators and error handling

### Phase 6: Optimization & Polish (Week 6-7)
- [ ] Profile and optimize performance
- [ ] Add script validation and sandboxing
- [ ] Implement error recovery
- [ ] Create example scripts library
- [ ] Write user documentation

## Testing Strategy

1. **Unit Tests**: Test each Lua API function
2. **Integration Tests**: Script execution end-to-end
3. **Performance Tests**: Frame rate, memory usage
4. **Compatibility Tests**: Run all DROP example scripts
5. **Stress Tests**: Max scripts, large scripts, rapid switching

## Security Considerations

1. **Sandbox Lua Environment**: Disable file I/O, system calls
2. **Memory Limits**: Prevent allocation attacks
3. **Execution Timeout**: Kill long-running scripts
4. **Input Validation**: Sanitize all script content
5. **Access Control**: Limit script operations to canvas only

## Future Enhancements

1. **Script Marketplace**: Share scripts between users
2. **Live Preview**: Stream canvas to web app
3. **Debugging**: Breakpoints and variable inspection
4. **Performance Mode**: JIT compilation for complex scripts
5. **Multi-Canvas**: Support for layered compositions

## Dependencies

- ESP-IDF or Arduino framework
- Lua 5.4 source code
- LittleFS library
- Existing EISEI codebase
- DROP web app infrastructure

## Success Criteria

- [ ] Run all existing DROP pixel art scripts on ESP32
- [ ] < 50ms script execution time per frame
- [ ] < 128KB total RAM usage
- [ ] Seamless sync between web and device
- [ ] No crashes or memory leaks in 24-hour test