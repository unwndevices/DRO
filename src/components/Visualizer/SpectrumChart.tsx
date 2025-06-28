import React, { useRef, useEffect } from 'react';
import './SpectrumChart.css';
import type { SpectralFrame } from '../../services/DataModel/types.ts';

interface SpectrumChartProps {
  frames: SpectralFrame[];
  currentFrame: number;
  className?: string;
}

export const SpectrumChart: React.FC<SpectrumChartProps> = ({
  frames,
  currentFrame,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    drawGrid(ctx, rect.width, rect.height);

    // Draw spectrum bars
    if (frames.length > 0 && currentFrame < frames.length) {
      const frame = frames[currentFrame];
      if (frame && frame.bands) {
        drawSpectrum(ctx, frame.bands, rect.width, rect.height);
      }
    }

  }, [frames, currentFrame]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#664D00';
    ctx.lineWidth = 0.5;

    // Horizontal lines
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = (height / horizontalLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical lines (for bands)
    const bands = 20;
    const barWidth = width / bands;
    for (let i = 0; i <= bands; i++) {
      const x = barWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const drawSpectrum = (ctx: CanvasRenderingContext2D, bands: number[], width: number, height: number) => {
    if (!bands || bands.length === 0) return;

    const barWidth = width / bands.length;
    const maxHeight = height - 20; // Leave space for labels

    // Find min/max for normalization
    const maxValue = Math.max(...bands);
    const minValue = Math.min(...bands);
    const range = maxValue - minValue;

    // Debug logging for visualization issues
    console.log('Chart Debug - bands:', bands.length, 'range:', minValue.toFixed(3), '→', maxValue.toFixed(3));

    bands.forEach((value, index) => {
      // Normalize value to 0-1 range
      const normalizedValue = range === 0 ? 0.5 : (value - minValue) / range;
      const barHeight = normalizedValue * maxHeight;

      const x = index * barWidth;
      const y = height - barHeight - 10;

      // Draw bar
      ctx.fillStyle = '#FFBF00';
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

      // Add glow effect
      ctx.shadowColor = '#FFBF00';
      ctx.shadowBlur = 2;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      ctx.shadowBlur = 0;

      // Draw band label
      if (index % 2 === 0) { // Only every other label to avoid crowding
        ctx.fillStyle = '#999999';
        ctx.font = '10px Fira Mono';
        ctx.textAlign = 'center';
        ctx.fillText(
          (index + 1).toString(),
          x + barWidth / 2,
          height - 2
        );
      }
    });

    // Draw value labels on the left
    ctx.fillStyle = '#999999';
    ctx.font = '10px Fira Mono';
    ctx.textAlign = 'right';
    
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = minValue + (range * (labelCount - i) / labelCount);
      const y = (height / labelCount) * i + 15;
      ctx.fillText(value.toFixed(2), width - 5, y);
    }
  };

  const currentFrameData = frames[currentFrame];
  const bandCount = currentFrameData?.bands?.length || 20;
  const frameCount = frames.length;

  return (
    <div className={`dro-spectrum-chart ${className}`}>
      <canvas
        ref={canvasRef}
        className="dro-chart-canvas"
      />
      <div className="dro-chart-info">
        <div className="dro-chart-stats">
          <span>Frame: {currentFrame + 1}/{frameCount}</span>
          <span>Bands: {bandCount}</span>
          {currentFrameData && (
            <span>
              Range: {Math.min(...currentFrameData.bands).toFixed(2)} → {Math.max(...currentFrameData.bands).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}; 