import React, { useRef, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { ChartControls } from './ChartControls';
import type { ChartType } from './ChartControls';
import './EnhancedSpectrumChart.css';
import type { SpectralFrame } from '../../services/DataModel/types.ts';

interface EnhancedSpectrumChartProps {
  frames: SpectralFrame[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  className?: string;
}

export const EnhancedSpectrumChart: React.FC<EnhancedSpectrumChartProps> = ({
  frames,
  currentFrame,
  onFrameChange,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartType, setChartType] = useState<ChartType>('bars');
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1.0);

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

    // Apply zoom transformation
    ctx.save();
    ctx.scale(zoom, zoom);

    // Draw based on chart type
    switch (chartType) {
      case 'bars':
        drawBarsChart(ctx, frames, currentFrame, rect.width / zoom, rect.height / zoom);
        break;
      case 'line':
        drawLineChart(ctx, frames, currentFrame, rect.width / zoom, rect.height / zoom);
        break;
      case 'waterfall':
        drawWaterfallChart(ctx, frames, currentFrame, rect.width / zoom, rect.height / zoom);
        break;
      case 'surface':
        draw3DSurface(ctx, frames, currentFrame, rect.width / zoom, rect.height / zoom);
        break;
    }

    ctx.restore();

    // Draw frequency labels and grid
    drawFrequencyLabels(ctx, rect.width, rect.height);

  }, [frames, currentFrame, chartType, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const getFrequencyForBand = (band: number, totalBands: number = 20): number => {
    const freqRatio = band / (totalBands - 1);
    return 80 * Math.pow(8000 / 80, freqRatio); // Logarithmic scale: 80Hz to 8kHz
  };

  const drawBarsChart = (ctx: CanvasRenderingContext2D, frames: SpectralFrame[], frameIndex: number, width: number, height: number) => {
    if (frames.length === 0 || frameIndex >= frames.length) return;

    const frame = frames[frameIndex];
    if (!frame?.bands) return;

    const bands = frame.bands;
    const barWidth = width / bands.length;
    const maxHeight = height - 40; // Leave space for labels

    // Find min/max for normalization
    const maxValue = Math.max(...bands);
    const minValue = Math.min(...bands);
    const range = maxValue - minValue;

    bands.forEach((value, index) => {
      const normalizedValue = range === 0 ? 0.5 : (value - minValue) / range;
      const barHeight = normalizedValue * maxHeight;

      const x = index * barWidth;
      const y = height - barHeight - 30;

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
    });
  };

  const drawLineChart = (ctx: CanvasRenderingContext2D, frames: SpectralFrame[], frameIndex: number, width: number, height: number) => {
    if (frames.length === 0 || frameIndex >= frames.length) return;

    const frame = frames[frameIndex];
    if (!frame?.bands) return;

    const bands = frame.bands;
    const stepWidth = width / (bands.length - 1);
    const maxHeight = height - 40;

    // Find min/max for normalization
    const maxValue = Math.max(...bands);
    const minValue = Math.min(...bands);
    const range = maxValue - minValue;

    ctx.strokeStyle = '#FFBF00';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add glow effect
    ctx.shadowColor = '#FFBF00';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    bands.forEach((value, index) => {
      const normalizedValue = range === 0 ? 0.5 : (value - minValue) / range;
      const x = index * stepWidth;
      const y = height - (normalizedValue * maxHeight) - 30;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw points
    bands.forEach((value, index) => {
      const normalizedValue = range === 0 ? 0.5 : (value - minValue) / range;
      const x = index * stepWidth;
      const y = height - (normalizedValue * maxHeight) - 30;

      ctx.fillStyle = '#FFBF00';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawWaterfallChart = (ctx: CanvasRenderingContext2D, frames: SpectralFrame[], frameIndex: number, width: number, height: number) => {
    if (frames.length === 0) return;

    const visibleFrames = Math.min(50, frames.length); // Show last 50 frames
    const startFrame = Math.max(0, frameIndex - visibleFrames + 1);
    const frameHeight = (height - 40) / visibleFrames;
    const bandWidth = width / 20;

    for (let f = 0; f < visibleFrames; f++) {
      const actualFrame = startFrame + f;
      if (actualFrame >= frames.length || !frames[actualFrame]?.bands) continue;

      const bands = frames[actualFrame].bands;
      const y = height - 30 - (f + 1) * frameHeight;
      const alpha = f / visibleFrames; // Fade older frames

      bands.forEach((value, bandIndex) => {
        const x = bandIndex * bandWidth;
        const intensity = Math.max(0, Math.min(1, value));

        // Color based on intensity
        const red = Math.floor(255 * intensity);
        const green = Math.floor(191 * intensity);
        const blue = 0;

        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        ctx.fillRect(x, y, bandWidth - 1, frameHeight - 1);
      });
    }

    // Highlight current frame
    if (currentFrame < frames.length && frames[currentFrame]?.bands) {
      const y = height - 30 - frameHeight;
      ctx.strokeStyle = '#FFBF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, y, width, frameHeight);
    }
  };

  const draw3DSurface = (ctx: CanvasRenderingContext2D, frames: SpectralFrame[], frameIndex: number, width: number, height: number) => {
    if (frames.length === 0) return;

    const visibleFrames = Math.min(20, frames.length);
    const startFrame = Math.max(0, frameIndex - visibleFrames + 1);

    // 3D projection parameters
    const perspective = 0.6;
    const tilt = 0.3;

    for (let f = 0; f < visibleFrames; f++) {
      const actualFrame = startFrame + f;
      if (actualFrame >= frames.length || !frames[actualFrame]?.bands) continue;

      const bands = frames[actualFrame].bands;
      const frameDepth = f / visibleFrames;

      // Create 3D line for this frame
      ctx.strokeStyle = `rgba(255, 191, 0, ${1 - frameDepth * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();

      bands.forEach((value, bandIndex) => {
        const x = (bandIndex / bands.length) * width;
        const z = frameDepth * height * perspective;
        const y = height - (value * (height - 40)) - 30 - z * tilt;
        const projectedX = x + z * 0.5;

        if (bandIndex === 0) {
          ctx.moveTo(projectedX, y);
        } else {
          ctx.lineTo(projectedX, y);
        }
      });

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
      const y = height - 30 - (index / (magLabels.length - 1)) * (height - 40);
      ctx.fillText(label, width - 5, y + 3);
    });
  };

  const handleExport = async (format: 'json' | 'csv' | 'png') => {
    switch (format) {
      case 'json':
        exportAsJSON();
        break;
      case 'csv':
        exportAsCSV();
        break;
      case 'png':
        exportAsPNG();
        break;
    }
  };

  const exportAsJSON = () => {
    const data = {
      metadata: {
        frameCount: frames.length,
        bandCount: frames[0]?.bands?.length || 20,
        sampleRate: 44100,
        exportDate: new Date().toISOString(),
        chartType
      },
      frames
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `drop-spectral-data-${Date.now()}.json`);
  };

  const exportAsCSV = () => {
    if (frames.length === 0) return;

    const bandCount = frames[0]?.bands?.length || 20;
    let csv = 'Frame,';

    // Header row
    for (let b = 0; b < bandCount; b++) {
      const freq = getFrequencyForBand(b);
      csv += `${freq.toFixed(1)}Hz${b < bandCount - 1 ? ',' : ''}`;
    }
    csv += '\n';

    // Data rows
    frames.forEach((frame, index) => {
      csv += `${index},`;
      if (frame.bands) {
        csv += frame.bands.map(v => v.toFixed(4)).join(',');
      }
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `drop-spectral-data-${Date.now()}.csv`);
  };

  const exportAsPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `drop-visualization-${Date.now()}.png`);
      }
    }, 'image/png');
  };

  const currentFrameData = frames[currentFrame];
  const bandCount = currentFrameData?.bands?.length || 20;
  const frameCount = frames.length;

  return (
    <div className={`drop-enhanced-spectrum-chart ${className}`}>
      <ChartControls
        chartType={chartType}
        onChartTypeChange={setChartType}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        currentFrame={currentFrame}
        totalFrames={frameCount}
        onFrameChange={onFrameChange}
        onExport={handleExport}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div className="drop-chart-container">
        <canvas
          ref={canvasRef}
          className="drop-enhanced-chart-canvas"
        />

        <div className="drop-chart-info">
          <div className="drop-chart-stats">
            <span>Mode: {chartType.toUpperCase()}</span>
            <span>Frame: {currentFrame + 1}/{frameCount}</span>
            <span>Bands: {bandCount}</span>
            {currentFrameData && (
              <span>
                Range: {Math.min(...currentFrameData.bands).toFixed(3)} → {Math.max(...currentFrameData.bands).toFixed(3)}
              </span>
            )}
            <span>Zoom: {zoom.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 