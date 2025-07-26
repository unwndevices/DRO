import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Code } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';

// UI Graphics constants
const COLOR_LUT = [
  '#000000', // 0 - Darkest
  '#2b2601', // 2
  '#474100', // 5
  '#8b7e00', // 10
  '#ffe500'  // 15 - Brightest
];

const COLOR_INDICES = [0, 2, 5, 10, 15];
const TRANSPARENT_INDEX = 1;
const CANVAS_SIZE = 508;
const SCALE = 4;

// Color mapping function
const mapColor = (r: number, g: number, b: number, a: number, range: [number, number]): number => {
  if (a === 0) return TRANSPARENT_INDEX;

  const avg = (r + g + b) / 3;
  // Map the average to 0-1 range based on min/max values
  const normalized = Math.max(0, Math.min(1, (avg - range[0]) / (range[1] - range[0])));
  const index = Math.min(Math.floor(normalized * COLOR_LUT.length), COLOR_LUT.length - 1);
  return COLOR_INDICES[index];
};

// Process image data with correct color mapping
const processImageData = (data: Uint8ClampedArray, range: [number, number]) => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const colorIndex = mapColor(r, g, b, a, range);
    if (colorIndex === TRANSPARENT_INDEX) {
      data[i + 3] = 0; // Make transparent
    } else {
      const newColor = COLOR_LUT[COLOR_INDICES.indexOf(colorIndex)];
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(newColor);
      if (result) {
        data[i] = parseInt(result[1], 16);     // R
        data[i + 1] = parseInt(result[2], 16); // G
        data[i + 2] = parseInt(result[3], 16); // B
      }
    }
  }
  return data;
};

// Storage keys
const STORAGE_KEYS = {
  IMAGES: 'drop-ui-graphics-images',
  FPS: 'drop-ui-graphics-fps',
  RANGE: 'drop-ui-graphics-range',
  FILENAME: 'drop-ui-graphics-filename'
};

export const UIGraphicsConverter: React.FC = () => {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayFrame, setDisplayFrame] = useState(0);
  const [fps, setFps] = useState(() => {
    const savedFps = localStorage.getItem(STORAGE_KEYS.FPS);
    return savedFps ? parseInt(savedFps) : 12;
  });
  const [range, setRange] = useState<[number, number]>(() => {
    const savedRange = localStorage.getItem(STORAGE_KEYS.RANGE);
    return savedRange ? JSON.parse(savedRange) : [0, 255];
  });
  const [filename, setFilename] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FILENAME) || '';
  });
  const [generatedCode, setGeneratedCode] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const currentFrameRef = useRef(0);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FPS, fps.toString());
  }, [fps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RANGE, JSON.stringify(range));
  }, [range]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILENAME, filename);
  }, [filename]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type === 'image/png' || file.type === 'image/bmp'
    ).sort((a, b) => a.name.localeCompare(b.name));

    if (files.length === 0) return;

    // Extract filename without extension for the first file
    const firstFileName = files[0].name.replace(/\.[^/.]+$/, '');
    setFilename(firstFileName);

    const loadImages = files.map(file => {
      return new Promise<HTMLImageElement>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadImages).then(loadedImages => {
      setImages(loadedImages);
      // Save image data URLs to localStorage
      const imageUrls = loadedImages.map(img => img.src);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(imageUrls));

      currentFrameRef.current = 0;
      setDisplayFrame(0);
    });
  };

  const drawFrame = (frameIndex: number) => {
    if (!images[frameIndex] || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[frameIndex];

    // Create temporary canvas for color processing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = img.width;
    tempCanvas.height = img.height;

    // Draw original image to temp canvas
    tempCtx.drawImage(img, 0, 0);

    // Get image data for processing
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

    // Process image data with correct color mapping
    processImageData(imageData.data, range);

    // Put processed image data back
    tempCtx.putImageData(imageData, 0, 0);

    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaled dimensions and offsets
    const scaledWidth = img.width * SCALE;
    const scaledHeight = img.height * SCALE;
    const offsetX = (CANVAS_SIZE - scaledWidth) / 2;
    const offsetY = (CANVAS_SIZE - scaledHeight) / 2;

    // Draw the processed and scaled image
    ctx.drawImage(
      tempCanvas,
      0, 0, img.width, img.height,
      offsetX, offsetY, scaledWidth, scaledHeight
    );
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };



  const generateCode = () => {
    if (images.length === 0) return '';

    const firstImage = images[0];
    const width = firstImage.width;
    const height = firstImage.height;
    const numPixels = width * height;
    const framesInfo = images.length > 1 ? `[${images.length}]` : '';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_]/g, '_') || 'image';

    // Generate header
    let code = `#include <stdint.h>\n\n`;
    code += `static const uint8_t ${cleanFilename}_${width}x${height}${framesInfo}[${numPixels}] = `;

    // Add opening brace for multiple frames
    if (images.length > 1) {
      code += '{\n';
    }
    code += '{\n';

    // Process each frame
    for (let frameIndex = 0; frameIndex < images.length; frameIndex++) {
      if (frameIndex > 0) {
        code += '    }, {\n';
      }

      const img = images[frameIndex];
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) continue;

      tempCanvas.width = width;
      tempCanvas.height = height;

      // Draw image to temp canvas
      tempCtx.drawImage(img, 0, 0);

      // Get image data
      const imageData = tempCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const index = mapColor(r, g, b, a, range);

        code += `0x${index.toString(16).padStart(2, '0')},`;
        if ((i / 4 + 1) % width === 0) code += '\n    ';
      }
    }

    // Close the array with proper braces
    code = code.replace(/,\s*$/, '\n}');
    if (images.length > 1) {
      code += '\n};';
    } else {
      code += ';';
    }

    return code;
  };

  const handleCopyCode = () => {
    const code = generateCode();
    if (!code) return;

    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
      console.log('Code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy code:', err);
    });
  };

  // Draw first frame when images are loaded
  useEffect(() => {
    if (images.length > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = CANVAS_SIZE;
          canvas.height = CANVAS_SIZE;
          ctx.imageSmoothingEnabled = false;
          drawFrame(0);
        }
      }
    }
  }, [images]);

  // Update generated code when images, filename, or range change
  useEffect(() => {
    const code = generateCode();
    setGeneratedCode(code);
  }, [images, filename, range]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || images.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastFrameTime.current) {
        lastFrameTime.current = timestamp;
      }

      const elapsed = timestamp - lastFrameTime.current;
      const frameTime = 1000 / fps;

      if (elapsed >= frameTime) {
        currentFrameRef.current = (currentFrameRef.current + 1) % images.length;
        drawFrame(currentFrameRef.current);
        setDisplayFrame(currentFrameRef.current);
        lastFrameTime.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastFrameTime.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, images.length, fps]);

  return (
    <div className="ui-graphics-converter">
      <div className="tool-controls">
        <div className="controls-section">
          <div className="file-input-section">
            <input
              type="file"
              multiple
              accept=".png,.bmp"
              onChange={handleFileSelect}
              className="file-input"
            />
          </div>

          <div className="playback-controls">
            <div className="fps-control">
              <label>FPS:</label>
              <input
                type="number"
                value={fps}
                onChange={(e) => setFps(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="fps-input"
              />
            </div>

            <button
              onClick={togglePlayback}
              disabled={images.length === 0}
              className="playback-button btn-primary"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>

          <div className="range-control">
            <label>Dynamic Range:</label>
            <div className="range-slider-container">
              <span className="range-value">{range[0]}</span>
              <Slider.Root
                className="range-slider"
                value={range}
                onValueChange={(value) => setRange(value as [number, number])}
                min={0}
                max={255}
                step={1}
              >
                <Slider.Track className="range-track">
                  <Slider.Range className="range-fill" />
                </Slider.Track>
                <Slider.Thumb className="range-thumb" />
                <Slider.Thumb className="range-thumb" />
              </Slider.Root>
              <span className="range-value">{range[1]}</span>
            </div>
          </div>

          <div className="filename-section">
            <div className="filename-display">
              {filename ? (
                <span className="filename">{filename}</span>
              ) : (
                <span className="filename-placeholder">No file selected</span>
              )}
            </div>
            <button
              onClick={handleCopyCode}
              disabled={images.length === 0}
              className="copy-button btn-secondary"
              title="Copy C header code"
            >
              <Code className="w-4 h-4" />
              Copy Code
            </button>
          </div>

          {images.length > 0 && (
            <div className="frame-info">
              Frame: {displayFrame + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      <MainContent>
        <SplitLayout
          left={
            <Panel title="Preview" className="preview-panel">
              <div className="canvas-container">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="preview-canvas"
                />
              </div>
            </Panel>
          }
          right={
            <Panel title="Generated Code" className="code-panel">
              <div className="code-preview">
                {generatedCode ? (
                  <pre className="code-block">
                    <code>{generatedCode}</code>
                  </pre>
                ) : (
                  <div className="code-placeholder">
                    <p>Load an image to see the generated C code</p>
                  </div>
                )}
              </div>
            </Panel>
          }
        />
      </MainContent>
    </div>
  );
};