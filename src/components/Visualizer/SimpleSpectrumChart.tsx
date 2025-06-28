import React, { useRef, useEffect, useState } from 'react';
import './SimpleSpectrumChart.css';
import type { SpectralFrame } from '../../services/DataModel/types.ts';

interface SimpleSpectrumChartProps {
  frames: SpectralFrame[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  className?: string;
}

export const SimpleSpectrumChart: React.FC<SimpleSpectrumChartProps> = ({
  frames,
  currentFrame,
  onFrameChange,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    
    const interval = setInterval(() => {
      onFrameChange((currentFrame + 1) % frames.length);
    }, 50); // 20 FPS playback
    
    return () => clearInterval(interval);
  }, [isPlaying, currentFrame, frames.length, onFrameChange]);

  // Chart rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw spectrum bars
    if (frames.length > 0 && currentFrame < frames.length) {
      const frame = frames[currentFrame];
      if (frame && frame.bands) {
        drawBarsChart(ctx, frame.bands, rect.width, rect.height);
      }
    }

    // Draw frequency labels and grid
    drawFrequencyLabels(ctx, rect.width, rect.height);
    
  }, [frames, currentFrame]);

  const getFrequencyForBand = (band: number, totalBands: number = 20): number => {
    const freqRatio = band / (totalBands - 1);
    return 80 * Math.pow(8000 / 80, freqRatio); // Logarithmic scale: 80Hz to 8kHz
  };

  const drawBarsChart = (ctx: CanvasRenderingContext2D, bands: number[], width: number, height: number) => {
    if (!bands || bands.length === 0) return;

    const barWidth = width / bands.length;
    const maxHeight = height - 60; // Leave space for labels and controls

    // Draw grid lines
    drawGrid(ctx, width, height);

    bands.forEach((value, index) => {
      const barHeight = value * maxHeight; // Values are already 0-1

      const x = index * barWidth;
      const y = height - barHeight - 40;

      // Draw bar with gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#FFBF00');
      gradient.addColorStop(1, '#FF8C00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

      // Add glow effect
      ctx.shadowColor = '#FFBF00';
      ctx.shadowBlur = 4;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      ctx.shadowBlur = 0;

      // Draw band labels
      if (index % 2 === 0) { // Only every other label to avoid crowding
        ctx.fillStyle = '#999999';
        ctx.font = '9px Fira Mono';
        ctx.textAlign = 'center';
        ctx.fillText(
          (index + 1).toString(),
          x + barWidth / 2,
          height - 25
        );
      }
    });
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#664D00';
    ctx.lineWidth = 0.5;

    // Horizontal lines
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = 20 + ((height - 60) / horizontalLines) * i;
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
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 40);
      ctx.stroke();
    }
  };

  const drawFrequencyLabels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#999999';
    ctx.font = '10px Fira Mono';
    ctx.textAlign = 'center';

    // Draw frequency labels
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const bandIndex = (i / labelCount) * 19; // 0 to 19
      const frequency = getFrequencyForBand(bandIndex);
      const x = (i / labelCount) * width;
      
      let label: string;
      if (frequency >= 1000) {
        label = `${(frequency / 1000).toFixed(1)}k`;
      } else {
        label = `${Math.round(frequency)}`;
      }
      
      ctx.fillText(label, x, height - 5);
    }

    // Draw magnitude labels
    ctx.textAlign = 'right';
    const magLabels = ['0.0', '0.25', '0.5', '0.75', '1.0'];
    magLabels.forEach((label, index) => {
      const y = height - 40 - (index / (magLabels.length - 1)) * (height - 60);
      ctx.fillText(label, width - 5, y + 3);
    });
  };

  const currentFrameData = frames[currentFrame];
  const bandCount = currentFrameData?.bands?.length || 20;
  const frameCount = frames.length;

  return (
    <div className={`dro-simple-spectrum-chart ${className}`}>
      <div className="dro-simple-controls">
        <button
          className="dro-play-button"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <div className="dro-frame-controls">
          <span className="dro-frame-info">
            Frame: {currentFrame + 1}/{frameCount}
          </span>
          <input
            type="range"
            className="dro-frame-slider"
            min="0"
            max={Math.max(0, frameCount - 1)}
            value={currentFrame}
            onChange={(e) => onFrameChange(parseInt(e.target.value))}
          />
        </div>
      </div>
      
      <div className="dro-chart-container">
        <canvas
          ref={canvasRef}
          className="dro-simple-chart-canvas"
        />
        
        <div className="dro-chart-info">
          <div className="dro-chart-stats">
            <span>Bands: {bandCount}</span>
            {currentFrameData && (
              <span>
                Range: {Math.min(...currentFrameData.bands).toFixed(3)} → {Math.max(...currentFrameData.bands).toFixed(3)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 