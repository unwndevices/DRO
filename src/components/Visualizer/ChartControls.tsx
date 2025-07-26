import React from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './ChartControls.css';

// Chart type definition
type ChartType = 'bars' | 'line' | 'waterfall' | 'surface';
export type { ChartType };

interface ChartControlsProps {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentFrame: number;
  totalFrames: number;
  onFrameChange: (frame: number) => void;
  onExport: (format: 'json' | 'csv' | 'png') => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  chartType,
  onChartTypeChange,
  isPlaying,
  onPlayPause,
  currentFrame,
  totalFrames,
  onFrameChange,
  onExport,
  zoom,
  onZoomChange
}) => {
  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'bars', label: 'Bars' },
    { value: 'line', label: 'Line' },
    { value: 'waterfall', label: 'Waterfall' },
    { value: 'surface', label: '3D Surface' }
  ];

  return (
    <div className="drop-chart-controls">
      <div className="drop-control-group">
        <label className="drop-control-label">Chart Type:</label>
        <select
          className="drop-select"
          value={chartType}
          onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
        >
          {chartTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="drop-control-group">
        <label className="drop-control-label">Playback:</label>
        <button
          className="drop-button drop-button-primary btn-primary"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <span className="drop-frame-info">
          {currentFrame + 1}/{totalFrames}
        </span>
      </div>

      <div className="drop-control-group drop-frame-slider">
        <label className="drop-control-label">Frame:</label>
        <input
          type="range"
          className="drop-slider"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
        />
      </div>

      <div className="drop-control-group">
        <label className="drop-control-label">Zoom:</label>
        <input
          type="range"
          className="drop-slider drop-zoom-slider"
          min="0.5"
          max="4"
          step="0.1"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        />
        <span className="drop-zoom-value">{zoom.toFixed(1)}x</span>
      </div>

      <div className="drop-control-group">
        <label className="drop-control-label">Export:</label>
        <button
          className="drop-button drop-button-secondary btn-secondary"
          onClick={() => onExport('json')}
          title="Export as JSON"
        >
          JSON
        </button>
        <button
          className="drop-button drop-button-secondary btn-secondary"
          onClick={() => onExport('csv')}
          title="Export as CSV"
        >
          CSV
        </button>
        <button
          className="drop-button drop-button-secondary btn-secondary"
          onClick={() => onExport('png')}
          title="Export as PNG"
        >
          PNG
        </button>
      </div>
    </div>
  );
}; 