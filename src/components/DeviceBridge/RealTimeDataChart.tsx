import React, { useRef, useEffect, useState } from 'react';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { RealTimeData } from '../../services/DeviceBridge/types';
import { useSettings } from '../../contexts/SettingsContext';
import './RealTimeDataChart.css';

interface RealTimeDataChartProps {
  deviceService: DeviceService;
  className?: string;
}

interface DataBuffer {
  spectralData: number[][];
  envelopes: number[][];
  cpuUsage: number[];
  latency: number[];
  timestamps: number[];
  maxSize: number;
}

export const RealTimeDataChart: React.FC<RealTimeDataChartProps> = ({
  deviceService,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();
  const [isReceivingData, setIsReceivingData] = useState(false);
  const [dataBuffer, setDataBuffer] = useState<DataBuffer>({
    spectralData: [],
    envelopes: [],
    cpuUsage: [],
    latency: [],
    timestamps: [],
    maxSize: 200 // Keep last 200 data points
  });

  useEffect(() => {
    const handleDataReceived = (event: any) => {
      const data: RealTimeData = event.payload.data;
      setIsReceivingData(true);
      
      setDataBuffer(prev => {
        const newBuffer = { ...prev };
        
        // Add new data point
        if (data.spectralData) {
          newBuffer.spectralData.push([...data.spectralData]);
        }
        if (data.envelopes) {
          newBuffer.envelopes.push([...data.envelopes]);
        }
        newBuffer.cpuUsage.push(data.cpuUsage || 0);
        newBuffer.latency.push(data.latency || 0);
        newBuffer.timestamps.push(data.timestamp);
        
        // Maintain buffer size
        if (newBuffer.spectralData.length > prev.maxSize) {
          newBuffer.spectralData.shift();
        }
        if (newBuffer.envelopes.length > prev.maxSize) {
          newBuffer.envelopes.shift();
        }
        if (newBuffer.cpuUsage.length > prev.maxSize) {
          newBuffer.cpuUsage.shift();
        }
        if (newBuffer.latency.length > prev.maxSize) {
          newBuffer.latency.shift();
        }
        if (newBuffer.timestamps.length > prev.maxSize) {
          newBuffer.timestamps.shift();
        }
        
        return newBuffer;
      });
    };

    deviceService.addEventListener('DATA_RECEIVED', handleDataReceived);

    return () => {
      deviceService.removeEventListener('DATA_RECEIVED', handleDataReceived);
    };
  }, [deviceService]);

  // Clear "receiving data" indicator after inactivity
  useEffect(() => {
    if (!isReceivingData) return;
    
    const timeout = setTimeout(() => {
      setIsReceivingData(false);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [dataBuffer, isReceivingData]);

  // Get current theme colors from CSS variables
  const getThemeColors = () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    return {
      background: computedStyle.getPropertyValue('--color-background').trim() || '#181818',
      primary: computedStyle.getPropertyValue('--color-accent').trim() || '#C7EE1B',
      primaryMuted: computedStyle.getPropertyValue('--color-accent-dark').trim() || '#9EBE0E',
      textMuted: computedStyle.getPropertyValue('--color-text-muted').trim() || '#999999',
      border: computedStyle.getPropertyValue('--color-border').trim() || '#333333',
    };
  };

  // Chart rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getThemeColors();
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    if (dataBuffer.spectralData.length === 0) {
      // Draw "no data" message
      ctx.fillStyle = colors.textMuted;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for device data...', width / 2, height / 2);
      return;
    }

    // Draw spectral data (waterfall/heatmap style)
    const spectralHeight = Math.floor(height * 0.6);
    const timeWidth = Math.min(width, dataBuffer.spectralData.length);
    const bandHeight = spectralHeight / 20; // 20 frequency bands
    
    for (let t = 0; t < timeWidth; t++) {
      const dataIndex = dataBuffer.spectralData.length - timeWidth + t;
      if (dataIndex < 0) continue;
      
      const spectrum = dataBuffer.spectralData[dataIndex];
      if (!spectrum) continue;
      
      for (let band = 0; band < 20; band++) {
        const value = spectrum[band] || 0;
        const normalizedValue = Math.max(0, Math.min(1, value));
        
        // Create color based on intensity
        const alpha = normalizedValue;
        ctx.fillStyle = `rgba(199, 238, 27, ${alpha})`; // Use theme accent color
        
        const x = (t / timeWidth) * width;
        const y = band * bandHeight;
        const w = width / timeWidth;
        const h = bandHeight;
        
        ctx.fillRect(x, y, w, h);
      }
    }

    // Draw frequency labels
    ctx.fillStyle = colors.textMuted;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    
    for (let band = 0; band < 20; band += 5) {
      const y = band * bandHeight + bandHeight / 2;
      const freq = Math.round((band / 20) * 20000); // Assuming 0-20kHz range
      ctx.fillText(`${freq}Hz`, 2, y + 3);
    }

    // Draw performance metrics at bottom
    const metricsY = spectralHeight + 20;
    const metricsHeight = height - metricsY - 10;
    
    if (dataBuffer.cpuUsage.length > 0 && metricsHeight > 40) {
      // CPU Usage graph
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < Math.min(dataBuffer.cpuUsage.length, width); i++) {
        const x = (i / Math.min(dataBuffer.cpuUsage.length, width)) * width;
        const cpuValue = dataBuffer.cpuUsage[dataBuffer.cpuUsage.length - Math.min(dataBuffer.cpuUsage.length, width) + i];
        const y = metricsY + (1 - cpuValue / 100) * (metricsHeight / 2);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // CPU label
      ctx.fillStyle = colors.textMuted;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CPU %', 2, metricsY + 12);
      
      // Latency graph (if available)
      if (dataBuffer.latency.length > 0) {
        ctx.strokeStyle = colors.primaryMuted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const maxLatency = Math.max(...dataBuffer.latency);
        
        for (let i = 0; i < Math.min(dataBuffer.latency.length, width); i++) {
          const x = (i / Math.min(dataBuffer.latency.length, width)) * width;
          const latencyValue = dataBuffer.latency[dataBuffer.latency.length - Math.min(dataBuffer.latency.length, width) + i];
          const y = metricsY + metricsHeight / 2 + (1 - latencyValue / maxLatency) * (metricsHeight / 2);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        
        // Latency label
        ctx.fillText('Latency', 2, metricsY + metricsHeight / 2 + 12);
      }
    }

    // Draw data rate indicator
    if (isReceivingData) {
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(width - 15, 15, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = colors.textMuted;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', width - 25, 20);
    }

  }, [dataBuffer, settings.theme, isReceivingData]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const clearBuffer = () => {
    setDataBuffer({
      spectralData: [],
      envelopes: [],
      cpuUsage: [],
      latency: [],
      timestamps: [],
      maxSize: 200
    });
  };

  const getCurrentStats = () => {
    if (dataBuffer.spectralData.length === 0) return null;
    
    const latest = dataBuffer.spectralData[dataBuffer.spectralData.length - 1];
    const avgCpu = dataBuffer.cpuUsage.length > 0 
      ? dataBuffer.cpuUsage.reduce((a, b) => a + b, 0) / dataBuffer.cpuUsage.length 
      : 0;
    const avgLatency = dataBuffer.latency.length > 0
      ? dataBuffer.latency.reduce((a, b) => a + b, 0) / dataBuffer.latency.length
      : 0;
    
    return {
      dataPoints: dataBuffer.spectralData.length,
      avgCpu: avgCpu.toFixed(1),
      avgLatency: avgLatency.toFixed(2),
      peakFreq: latest ? latest.indexOf(Math.max(...latest)) : 0
    };
  };

  const stats = getCurrentStats();

  return (
    <div className={`realtime-data-chart ${className}`}>
      <div className="chart-header">
        <h4 className="chart-title">REAL-TIME DATA</h4>
        <div className="chart-controls">
          {stats && (
            <div className="data-stats">
              <span className="stat">Points: {stats.dataPoints}</span>
              <span className="stat">CPU: {stats.avgCpu}%</span>
              <span className="stat">Latency: {stats.avgLatency}ms</span>
            </div>
          )}
          <button
            className="btn btn-ghost btn-small"
            onClick={clearBuffer}
            title="Clear data buffer"
          >
            CLEAR
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <canvas 
          ref={canvasRef}
          className="realtime-canvas"
        />
      </div>
    </div>
  );
};