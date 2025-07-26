import React, { useState, useCallback, useEffect } from 'react';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { PixelArtPreview, PixelArtCodeEditor, PixelArtExportModal } from '../../components/PixelArt';
import { LuaPixelService } from '../../services/PixelArt/LuaPixelService';
import type { PixelArtFrame, PixelCanvas } from '../../services/PixelArt/LuaPixelService';
import { LuaFactory } from 'wasmoon';
import './PixelArtGenerator.css';

// Default example script showcasing Love2D-style graphics API
const DEFAULT_SCRIPT = `-- Waveform Transition: Sine → Triangle → Square
-- Animation progresses through three waveform types over time
-- Uses f (frame index) and f_amt (total frames) for smooth transitions

graphics.clear(0)  -- Clear to black

-- Canvas dimensions and center
local w = graphics.getWidth()
local h = graphics.getHeight()
local cx = w / 2
local cy = h / 2

-- Animation progress (0 to 1 over all frames)
local progress = f / (f_amt - 1)

-- Waveform parameters
local amplitude = 25  -- Wave height
local frequency = 1   -- Single revolution across width

-- Helper functions
local function clamp(value, min_val, max_val)
    return math.max(min_val, math.min(max_val, value))
end

-- Smooth transition function (ease in/out)
local function smoothstep(t)
    t = clamp(t, 0, 1)
    return t * t * (3 - 2 * t)
end

-- Calculate which waveforms to blend and their weights
local sine_val, triangle_val, square_val = 0, 0, 0

if progress < 0.5 then
    -- First half: Sine to Triangle
    local blend = smoothstep(progress * 2)  -- 0 to 1 over first half
    sine_val = 1 - blend
    triangle_val = blend
else
    -- Second half: Triangle to Square  
    local blend = smoothstep((progress - 0.5) * 2)  -- 0 to 1 over second half
    triangle_val = 1 - blend
    square_val = blend
end

-- Generate waveform points
local points = {}
for x = 0, w - 1 do
    local t = x / w * frequency * 2 * math.pi
    local y_value = 0
    
    -- Calculate each waveform value
    local sine = math.sin(t)
    
    -- Triangle wave (sawtooth approach for cleaner transitions)
    local cycle_pos = (t / (2 * math.pi)) % 1
    local triangle
    if cycle_pos < 0.5 then
        triangle = 4 * cycle_pos - 1  -- -1 to 1 over first half
    else
        triangle = 3 - 4 * cycle_pos   -- 1 to -1 over second half
    end
    
    -- Square wave
    local square = math.sin(t) >= 0 and 1 or -1
    
    -- Blend the waveforms (weights always sum to 1, maintaining amplitude)
    y_value = sine_val * sine + triangle_val * triangle + square_val * square
    
    -- Scale and center the wave
    local y = cy + y_value * amplitude
    table.insert(points, {x = x, y = y})
end

-- Draw the waveform using lines with thickness
for i = 1, #points - 1 do
    local p1 = points[i]
    local p2 = points[i + 1]
    
    -- Color based on current phase
    local brightness = 0.9
    if sine_val > 0.5 then
        brightness = 0.7  -- Dimmer for sine
    elseif triangle_val > 0.5 then
        brightness = 0.85  -- Medium for triangle
    else
        brightness = 1.0  -- Brightest for square
    end
    
    local color_value = math.floor(brightness * 15)
    
    -- Draw multiple lines for thickness (works for all angles)
    line(p1.x, p1.y, p2.x, p2.y, color_value)  -- Center line
    line(p1.x, p1.y + 1, p2.x, p2.y + 1, color_value)  -- Line above
    line(p1.x, p1.y - 1, p2.x, p2.y - 1, color_value)  -- Line below
    line(p1.x + 1, p1.y, p2.x + 1, p2.y, color_value)  -- Line right
    line(p1.x - 1, p1.y, p2.x - 1, p2.y, color_value)  -- Line left
end

-- Draw center line for reference
graphics.setColor(0.2)
graphics.line(0, cy, w - 1, cy)

-- Draw phase indicator text  
local phase_text = ""
if sine_val > 0.5 then
    phase_text = "SINE"
elseif triangle_val > 0.5 then
    phase_text = "TRIANGLE" 
else
    phase_text = "SQUARE"
end

graphics.setColor(0.8)
graphics.print(phase_text, 5, 5)
graphics.print("FRAME " .. f, 5, h - 12)`;

// Singleton service instance
let pixelServiceInstance: LuaPixelService | null = null;

const getPixelService = (): LuaPixelService => {
  if (!pixelServiceInstance) {
    pixelServiceInstance = new LuaPixelService(127, 127);
  }
  return pixelServiceInstance;
};

export const PixelArtGenerator: React.FC = () => {
  const [pixelService] = useState(() => getPixelService());
  const [script, setScript] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-script');
      if (saved) {
        const scriptData = JSON.parse(saved);
        return scriptData.content || DEFAULT_SCRIPT;
      }
    } catch (error) {
      console.warn('DROP: Failed to load saved pixel script:', error);
    }
    return DEFAULT_SCRIPT;
  });
  const [frameCount, setFrameCount] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.frameCount || 60;
      }
    } catch (error) {
      console.warn('DROP: Failed to load saved pixel settings:', error);
    }
    return 60;
  });
  const [canvasWidth, setCanvasWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.canvasWidth || 127;
      }
    } catch (error) {
      console.warn('DROP: Failed to load saved pixel settings:', error);
    }
    return 127;
  });
  const [canvasHeight, setCanvasHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.canvasHeight || 127;
      }
    } catch (error) {
      console.warn('DROP: Failed to load saved pixel settings:', error);
    }
    return 127;
  });
  const [currentCanvas, setCurrentCanvas] = useState<PixelCanvas | null>(null);
  const [frames, setFrames] = useState<PixelArtFrame[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to generate pixel art');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        setStatusMessage('Initializing Lua engine...');
        const luaFactory = new LuaFactory();
        await pixelService.initializeLua(luaFactory);
        setStatusMessage('Ready to generate pixel art');
      } catch (error) {
        setStatusMessage(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setErrors([{ message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
      }
    };

    initServices();
  }, [pixelService]);

  // Auto-save script content whenever it changes
  useEffect(() => {
    if (script) {
      const scriptData = {
        content: script,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('drop-pixel-script', JSON.stringify(scriptData));
    }
  }, [script]);

  // Auto-save settings whenever they change
  useEffect(() => {
    const settings = {
      frameCount,
      canvasWidth,
      canvasHeight,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('drop-pixel-settings', JSON.stringify(settings));
  }, [frameCount, canvasWidth, canvasHeight]);

  // Execute script
  const executeScript = useCallback(async (code: string) => {
    if (isExecuting) return;

    setIsExecuting(true);
    setErrors([]);
    setStatusMessage('Executing script...');

    const startTime = performance.now();

    try {
      // Validate script first
      const validation = await pixelService.validateScript();
      if (!validation.valid) {
        setErrors(validation.errors.map(error => ({ message: error })));
        setStatusMessage('Script validation failed');
        return;
      }

      if (frameCount === 1) {
        // Single frame execution
        setStatusMessage('Generating single frame...');
        const frame = await pixelService.executeFrame(code, 0, frameCount);
        setCurrentCanvas(frame.canvas);
        setFrames([frame]);
        setStatusMessage('Single frame generated successfully');
      } else {
        // Multi-frame animation
        setStatusMessage(`Generating ${frameCount} frames...`);
        const generatedFrames = await pixelService.generateFrames(code, frameCount);
        setFrames(generatedFrames);
        setCurrentCanvas(generatedFrames[0]?.canvas || null);
        setStatusMessage(`Animation generated: ${frameCount} frames`);
      }

      const endTime = performance.now();
      setExecutionTime(endTime - startTime);

    } catch (error) {
      console.error('Pixel art execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      setErrors([{ message: errorMessage }]);
      setStatusMessage('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  }, [pixelService, frameCount, isExecuting]);

  // Handle frame count changes
  const handleFrameCountChange = useCallback((count: number) => {
    const clampedCount = Math.max(1, Math.min(1024, count));
    setFrameCount(clampedCount);
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setCurrentCanvas(null);
    setFrames([]);
    setErrors([]);
    setStatusMessage('Canvas cleared');
  }, []);

  return (
    <div className="pixel-art-generator-tool">
      <MainContent>
        <SplitLayout
          left={
            <Panel title="LUA PIXEL SCRIPT" className="script-panel">
              <PixelArtCodeEditor
                value={script}
                onChange={setScript}
                onExecute={executeScript}
                onClear={clearCanvas}
                onExport={() => setIsExportModalOpen(true)}
                errors={errors}
                frameCount={frameCount}
                onFrameCountChange={handleFrameCountChange}
                canvasWidth={canvasWidth}
                onCanvasWidthChange={setCanvasWidth}
                canvasHeight={canvasHeight}
                onCanvasHeightChange={setCanvasHeight}
                isExecuting={isExecuting}
                canExport={currentCanvas !== null || frames.length > 0}
                className="pixel-script-editor"
              />

            </Panel>
          }
          right={
            <Panel title="PIXEL ART PREVIEW" className="preview-panel">
              <PixelArtPreview
                frames={frames}
                currentCanvas={currentCanvas || undefined}
                showAnimation={frameCount > 1}
                animationSpeed={50}
                className="main-preview"
              />
            </Panel>
          }
        />
      </MainContent>

      <div className="tool-status">
        <div className="status-left">
          <div className="status-item">
            <span>Pixel Art Generator</span>
          </div>
          {executionTime && (
            <div className="status-item success">
              <span>Execution: {executionTime.toFixed(1)}ms</span>
            </div>
          )}
          {frameCount > 1 && (
            <div className="status-item">
              <span>Animation: {frameCount} frames</span>
            </div>
          )}
        </div>
        <div className="status-right">
          <div className="status-item">
            <span>{isExecuting ? 'Generating...' : statusMessage}</span>
          </div>
        </div>
      </div>

      <PixelArtExportModal
        frames={frames}
        currentCanvas={currentCanvas || undefined}
        pixelService={pixelService}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};