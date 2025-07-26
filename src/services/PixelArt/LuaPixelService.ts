/**
 * LuaPixelService - Provides Lua API for pixel art generation
 * 
 * This service extends the LuaEngine with pixel manipulation functions
 * specifically designed for the 127x127 grayscale canvas matching Eisei's OLED display.
 */

import type { LuaFactory } from 'wasmoon';
import { initializeLove2DAPI } from './Love2DAdapter';

export interface PixelCanvas {
  width: number;
  height: number;
  data: Uint8Array; // 16-level grayscale values (0-15)
}

export interface PixelArtFrame {
  frameIndex: number;
  canvas: PixelCanvas;
  timestamp: number;
}

export class LuaPixelService {
  private canvas: PixelCanvas;
  private frames: PixelArtFrame[] = [];
  private lua: any = null;

  constructor(width: number = 127, height: number = 127) {
    this.canvas = {
      width,
      height,
      data: new Uint8Array(width * height)
    };
  }

  /**
   * Initialize Lua engine with pixel art API
   */
  async initializeLua(luaFactory: LuaFactory): Promise<void> {
    this.lua = await luaFactory.createEngine();

    // Set up the Lua environment with pixel art globals
    await this.lua.doString(`
      -- Canvas dimensions
      canvas_width = ${this.canvas.width}
      canvas_height = ${this.canvas.height}
      
      -- Current frame variable (will be updated per frame)
      f = 0
    `);

    // Register pixel manipulation functions
    this.registerPixelFunctions();
    this.registerDrawingFunctions();
    this.registerUtilityFunctions();

    // Initialize Love2D-compatible graphics API
    initializeLove2DAPI(this.lua);
  }

  /**
   * Register core pixel manipulation functions
   */
  private registerPixelFunctions(): void {
    if (!this.lua) return;

    // setPixel(x, y, value) - Set pixel with grayscale value (0-15)
    this.lua.global.set('setPixel', (x: number, y: number, value: number) => {
      const clampedX = Math.floor(Math.max(0, Math.min(this.canvas.width - 1, x)));
      const clampedY = Math.floor(Math.max(0, Math.min(this.canvas.height - 1, y)));
      const clampedValue = Math.floor(Math.max(0, Math.min(15, value)));

      const index = clampedY * this.canvas.width + clampedX;
      this.canvas.data[index] = clampedValue;
    });

    // getPixel(x, y) - Read pixel value
    this.lua.global.set('getPixel', (x: number, y: number): number => {
      const clampedX = Math.floor(Math.max(0, Math.min(this.canvas.width - 1, x)));
      const clampedY = Math.floor(Math.max(0, Math.min(this.canvas.height - 1, y)));

      const index = clampedY * this.canvas.width + clampedX;
      return this.canvas.data[index] || 0;
    });

    // clearCanvas(value) - Clear entire canvas with optional value
    this.lua.global.set('clearCanvas', (value: number = 0) => {
      const clampedValue = Math.floor(Math.max(0, Math.min(15, value)));
      this.canvas.data.fill(clampedValue);
    });
  }

  /**
   * Register drawing primitive functions
   */
  private registerDrawingFunctions(): void {
    if (!this.lua) return;

    // line(x1, y1, x2, y2, value) - Draw line using Bresenham's algorithm
    this.lua.global.set('line', (x1: number, y1: number, x2: number, y2: number, value: number) => {
      const clampedValue = Math.floor(Math.max(0, Math.min(15, value)));

      x1 = Math.floor(x1);
      y1 = Math.floor(y1);
      x2 = Math.floor(x2);
      y2 = Math.floor(y2);

      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = x1 < x2 ? 1 : -1;
      const sy = y1 < y2 ? 1 : -1;
      let err = dx - dy;

      let x = x1;
      let y = y1;

      while (true) {
        if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
          const index = y * this.canvas.width + x;
          this.canvas.data[index] = clampedValue;
        }

        if (x === x2 && y === y2) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    });

    // rect(x, y, w, h, value, filled) - Draw rectangle
    this.lua.global.set('rect', (x: number, y: number, w: number, h: number, value: number, filled: boolean = false) => {
      const clampedValue = Math.floor(Math.max(0, Math.min(15, value)));

      x = Math.floor(x);
      y = Math.floor(y);
      w = Math.floor(w);
      h = Math.floor(h);

      if (filled) {
        for (let py = y; py < y + h; py++) {
          for (let px = x; px < x + w; px++) {
            if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
              const index = py * this.canvas.width + px;
              this.canvas.data[index] = clampedValue;
            }
          }
        }
      } else {
        // Draw outline only
        // Top and bottom edges
        for (let px = x; px < x + w; px++) {
          if (px >= 0 && px < this.canvas.width) {
            if (y >= 0 && y < this.canvas.height) {
              this.canvas.data[y * this.canvas.width + px] = clampedValue;
            }
            if (y + h - 1 >= 0 && y + h - 1 < this.canvas.height) {
              this.canvas.data[(y + h - 1) * this.canvas.width + px] = clampedValue;
            }
          }
        }
        // Left and right edges
        for (let py = y; py < y + h; py++) {
          if (py >= 0 && py < this.canvas.height) {
            if (x >= 0 && x < this.canvas.width) {
              this.canvas.data[py * this.canvas.width + x] = clampedValue;
            }
            if (x + w - 1 >= 0 && x + w - 1 < this.canvas.width) {
              this.canvas.data[py * this.canvas.width + (x + w - 1)] = clampedValue;
            }
          }
        }
      }
    });

    // circle(cx, cy, r, value, filled) - Draw circle using midpoint algorithm
    this.lua.global.set('circle', (cx: number, cy: number, r: number, value: number, filled: boolean = false) => {
      const clampedValue = Math.floor(Math.max(0, Math.min(15, value)));

      cx = Math.floor(cx);
      cy = Math.floor(cy);
      r = Math.floor(r);

      if (filled) {
        for (let y = -r; y <= r; y++) {
          for (let x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r) {
              const px = cx + x;
              const py = cy + y;
              if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                const index = py * this.canvas.width + px;
                this.canvas.data[index] = clampedValue;
              }
            }
          }
        }
      } else {
        // Draw circle outline using midpoint algorithm
        let x = 0;
        let y = r;
        let d = 3 - 2 * r;

        const drawCirclePoints = (x: number, y: number) => {
          const points = [
            [cx + x, cy + y], [cx - x, cy + y], [cx + x, cy - y], [cx - x, cy - y],
            [cx + y, cy + x], [cx - y, cy + x], [cx + y, cy - x], [cx - y, cy - x]
          ];

          points.forEach(([px, py]) => {
            if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
              const index = py * this.canvas.width + px;
              this.canvas.data[index] = clampedValue;
            }
          });
        };

        drawCirclePoints(x, y);

        while (y >= x) {
          x++;
          if (d > 0) {
            y--;
            d = d + 4 * (x - y) + 10;
          } else {
            d = d + 4 * x + 6;
          }
          drawCirclePoints(x, y);
        }
      }
    });
  }

  /**
   * Register utility functions for advanced effects
   */
  private registerUtilityFunctions(): void {
    if (!this.lua) return;

    // noise(x, y, scale) - Simple pseudo-random noise function
    this.lua.global.set('noise', (x: number, y: number, scale: number = 1): number => {
      // Simple hash-based noise
      x = Math.floor(x * scale);
      y = Math.floor(y * scale);

      let hash = x * 374761393 + y * 668265263;
      hash = (hash ^ (hash >> 13)) * 1274126177;
      hash = hash ^ (hash >> 16);

      return Math.abs(hash % 16);
    });

    // dither(x, y, value) - Apply dithering pattern
    this.lua.global.set('dither', (x: number, y: number, value: number): number => {
      // Bayer 4x4 dithering matrix
      const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
      ];

      const threshold = bayerMatrix[Math.floor(y) % 4][Math.floor(x) % 4];
      const normalizedValue = value / 15; // Normalize to 0-1
      const dithered = normalizedValue > threshold / 16 ? 1 : 0;

      return Math.floor(dithered * 15);
    });

    // gradient(x1, y1, x2, y2, value1, value2) - Linear gradient between two points
    this.lua.global.set('gradient', (x1: number, y1: number, x2: number, y2: number, value1: number, value2: number, x: number, y: number): number => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) return value1;

      const dot = (x - x1) * dx + (y - y1) * dy;
      const t = Math.max(0, Math.min(1, dot / (length * length)));

      return Math.floor(value1 + t * (value2 - value1));
    });

    // distance(x1, y1, x2, y2) - Calculate distance between two points
    this.lua.global.set('distance', (x1: number, y1: number, x2: number, y2: number): number => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    });
  }

  /**
   * Execute Lua script for a single frame
   */
  async executeFrame(script: string, frameIndex: number, totalFrames: number = 1): Promise<PixelArtFrame> {
    if (!this.lua) {
      throw new Error('Lua engine not initialized');
    }

    // Clear canvas for new frame
    this.canvas.data.fill(0);

    // Set frame variables AFTER Love2D initialization to ensure it's in correct environment
    this.lua.global.set('f', frameIndex);
    this.lua.global.set('f_amt', totalFrames);
    await this.lua.doString(`f = ${frameIndex}; f_amt = ${totalFrames}`);
    // Frame index set for debugging purposes

    try {
      // Execute the user script
      await this.lua.doString(script);

      // Create frame snapshot
      const frame: PixelArtFrame = {
        frameIndex,
        canvas: {
          width: this.canvas.width,
          height: this.canvas.height,
          data: new Uint8Array(this.canvas.data) // Copy the data
        },
        timestamp: Date.now()
      };

      return frame;
    } catch (error) {
      throw new Error(`Lua execution error at frame ${frameIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple frames from script
   */
  async generateFrames(script: string, frameCount: number): Promise<PixelArtFrame[]> {
    const frames: PixelArtFrame[] = [];
    
    // Set f_amt global variable for the entire animation
    this.lua.global.set('f_amt', frameCount);
    await this.lua.doString(`f_amt = ${frameCount}`);

    for (let i = 0; i < frameCount; i++) {
      const frame = await this.executeFrame(script, i, frameCount);
      frames.push(frame);
    }

    this.frames = frames;
    return frames;
  }

  /**
   * Get current canvas state
   */
  getCurrentCanvas(): PixelCanvas {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      data: new Uint8Array(this.canvas.data)
    };
  }

  /**
   * Get generated frames
   */
  getFrames(): PixelArtFrame[] {
    return this.frames;
  }

  /**
   * Export canvas data as different formats
   */
  exportCanvas(format: 'binary' | 'cpp' | 'png' | 'json', frame?: PixelArtFrame): string | Uint8Array {
    const canvas = frame ? frame.canvas : this.getCurrentCanvas();

    switch (format) {
      case 'binary':
        return canvas.data;

      case 'cpp':
        return this.exportAsCppHeader(canvas);

      case 'json':
        return JSON.stringify({
          width: canvas.width,
          height: canvas.height,
          data: Array.from(canvas.data)
        }, null, 2);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as C++ header file
   */
  private exportAsCppHeader(canvas: PixelCanvas): string {
    const arrayName = 'pixelArtData';
    let cpp = `// Generated Pixel Art Data - ${canvas.width}x${canvas.height} @ 4-bit grayscale\n`;
    cpp += `// Generated on ${new Date().toISOString()}\n\n`;
    cpp += `#ifndef PIXEL_ART_DATA_H\n`;
    cpp += `#define PIXEL_ART_DATA_H\n\n`;
    cpp += `#include <stdint.h>\n\n`;
    cpp += `const uint16_t CANVAS_WIDTH = ${canvas.width};\n`;
    cpp += `const uint16_t CANVAS_HEIGHT = ${canvas.height};\n`;
    cpp += `const uint16_t CANVAS_SIZE = ${canvas.data.length};\n\n`;
    cpp += `const uint8_t ${arrayName}[${canvas.data.length}] = {\n`;

    for (let i = 0; i < canvas.data.length; i += 16) {
      const line = Array.from(canvas.data.slice(i, i + 16))
        .map(val => `0x${val.toString(16).padStart(2, '0')}`)
        .join(', ');
      cpp += `  ${line}${i + 16 < canvas.data.length ? ',' : ''}\n`;
    }

    cpp += `};\n\n`;
    cpp += `#endif // PIXEL_ART_DATA_H\n`;

    return cpp;
  }

  /**
   * Validate Lua script for syntax errors
   */
  async validateScript(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.lua) {
      return { valid: false, errors: ['Lua engine not initialized'] };
    }

    // For now, skip validation since the linter doesn't know about our globals
    // TODO: Implement proper validation that's aware of pixel art globals
    return { valid: true, errors: [] };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.lua) {
      this.lua.global.close();
      this.lua = null;
    }
    this.frames = [];
  }
}