import React, { useRef, useEffect, useCallback } from 'react';
import type { PixelCanvas } from '../../services/PixelArt/LuaPixelService';
import './PixelArtCanvas.css';

interface PixelArtCanvasProps {
  canvas: PixelCanvas;
  className?: string;
  pixelSize?: number;
  showGrid?: boolean;
  gridSpacing?: number;
  onPixelClick?: (x: number, y: number, currentValue: number) => void;
  interactionMode?: 'view' | 'draw';
  drawValue?: number;
}

export const PixelArtCanvas: React.FC<PixelArtCanvasProps> = ({
  canvas,
  className = '',
  pixelSize = 4,
  showGrid = false,
  gridSpacing = 8,
  onPixelClick,
  interactionMode = 'view'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert 4-bit grayscale to yellow-tinted RGB
  const grayscaleToYellowRGB = useCallback((value: number): [number, number, number] => {
    // Normalize 0-15 to 0-1
    const normalized = value / 15;

    // Create yellow tint similar to Eisei's OLED aesthetic
    // Full intensity = bright yellow, zero = dark background
    const r = Math.floor(normalized * 199 + (1 - normalized) * 24); // 199 = yellow R, 24 = background R
    const g = Math.floor(normalized * 238 + (1 - normalized) * 24); // 238 = yellow G, 24 = background G  
    const b = Math.floor(normalized * 27 + (1 - normalized) * 24);  // 27 = yellow B, 24 = background B

    return [r, g, b];
  }, []);

  // Render the pixel canvas
  const renderCanvas = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const displayWidth = canvas.width * pixelSize;
    const displayHeight = canvas.height * pixelSize;

    canvasEl.width = displayWidth;
    canvasEl.height = displayHeight;
    canvasEl.style.width = `${displayWidth}px`;
    canvasEl.style.height = `${displayHeight}px`;

    // Create ImageData for efficient pixel rendering
    const imageData = ctx.createImageData(displayWidth, displayHeight);
    const data = imageData.data;
    
    // Helper function to get background color at position
    const getBackgroundColor = (canvasX: number, canvasY: number): [number, number, number] => {
      if (showGrid) {
        // 1 pixel per checker square - use canvas pixel coordinates
        const isEven = (canvasX + canvasY) % 2 === 0;
        return isEven ? [24, 24, 24] : [32, 32, 32]; // #181818 and #202020 - more subtle
      } else {
        return [24, 24, 24]; // #181818
      }
    };

    // Render each pixel
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const pixelValue = canvas.data[y * canvas.width + x];

        // Fill the pixel area
        for (let py = 0; py < pixelSize; py++) {
          for (let px = 0; px < pixelSize; px++) {
            const imageX = x * pixelSize + px;
            const imageY = y * pixelSize + py;

            if (imageX < displayWidth && imageY < displayHeight) {
              const index = (imageY * displayWidth + imageX) * 4;
              
              if (pixelValue === 0) {
                // Use background color for transparent pixels - use canvas coordinates
                const [bgR, bgG, bgB] = getBackgroundColor(x, y);
                data[index] = bgR;
                data[index + 1] = bgG;
                data[index + 2] = bgB;
                data[index + 3] = 255;
              } else {
                // Use pixel color for non-transparent pixels
                const [r, g, b] = grayscaleToYellowRGB(pixelValue);
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255;
              }
            }
          }
        }
      }
    }

    // Put the image data on the canvas
    ctx.putImageData(imageData, 0, 0);

  }, [canvas, pixelSize, showGrid, gridSpacing, grayscaleToYellowRGB]);

  // Handle mouse/touch interactions
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPixelClick || interactionMode !== 'draw') return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / pixelSize);
    const y = Math.floor((event.clientY - rect.top) / pixelSize);

    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const currentValue = canvas.data[y * canvas.width + x];
      onPixelClick(x, y, currentValue);
    }
  }, [onPixelClick, interactionMode, pixelSize, canvas.width, canvas.height]);

  // Handle mouse drag for drawing
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPixelClick || interactionMode !== 'draw') return;

    // Only draw if mouse button is pressed
    if (event.buttons === 1) {
      handleCanvasClick(event);
    }
  }, [handleCanvasClick, onPixelClick, interactionMode]);

  // Re-render when canvas data changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div
      ref={containerRef}
      className={`pixel-art-canvas-container ${className}`}
    >
      <canvas
        ref={canvasRef}
        className={`pixel-art-canvas ${interactionMode === 'draw' ? 'interactive' : ''}`}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleCanvasClick}
      />
    </div>
  );
};