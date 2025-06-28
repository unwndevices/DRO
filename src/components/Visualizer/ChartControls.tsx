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
    <div className="dro-chart-controls">
      <div className="dro-control-group">
        <label className="dro-control-label">Chart Type:</label>
        <select
          className="dro-select"
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

      <div className="dro-control-group">
        <label className="dro-control-label">Playback:</label>
        <button
          className="dro-button dro-button-primary"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <span className="dro-frame-info">
          {currentFrame + 1}/{totalFrames}
        </span>
      </div>

      <div className="dro-control-group dro-frame-slider">
        <label className="dro-control-label">Frame:</label>
        <input
          type="range"
          className="dro-slider"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
        />
      </div>

      <div className="dro-control-group">
        <label className="dro-control-label">Zoom:</label>
        <input
          type="range"
          className="dro-slider dro-zoom-slider"
          min="0.5"
          max="4"
          step="0.1"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        />
        <span className="dro-zoom-value">{zoom.toFixed(1)}x</span>
      </div>

      <div className="dro-control-group">
        <label className="dro-control-label">Export:</label>
        <button
          className="dro-button dro-button-secondary"
          onClick={() => onExport('json')}
          title="Export as JSON"
        >
          JSON
        </button>
        <button
          className="dro-button dro-button-secondary"
          onClick={() => onExport('csv')}
          title="Export as CSV"
        >
          CSV
        </button>
        <button
          className="dro-button dro-button-secondary"
          onClick={() => onExport('png')}
          title="Export as PNG"
        >
          PNG
        </button>
      </div>
    </div>
  );
}; 