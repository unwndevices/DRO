import React, { useState, useCallback } from 'react';
import type { PixelArtFrame, PixelCanvas } from '../../services/PixelArt/LuaPixelService';
import { LuaPixelService } from '../../services/PixelArt/LuaPixelService';
import './PixelArtExport.css';

interface PixelArtExportProps {
  frames: PixelArtFrame[];
  currentCanvas?: PixelCanvas;
  pixelService: LuaPixelService;
  className?: string;
}

type ExportFormat = 'binary' | 'cpp' | 'json' | 'png';

export const PixelArtExport: React.FC<PixelArtExportProps> = ({
  frames,
  currentCanvas,
  pixelService,
  className = ''
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('cpp');
  const [includeFrames, setIncludeFrames] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  // Generate PNG data from canvas
  const generatePNG = useCallback((canvas: PixelCanvas): Blob => {
    // Create a temporary canvas for PNG generation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d')!;

    // Create ImageData
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // Convert grayscale to yellow-tinted RGB
    for (let i = 0; i < canvas.data.length; i++) {
      const value = canvas.data[i];
      const normalized = value / 15;
      
      // Yellow tint similar to Eisei's OLED
      const r = Math.floor(normalized * 199 + (1 - normalized) * 24);
      const g = Math.floor(normalized * 238 + (1 - normalized) * 24);
      const b = Math.floor(normalized * 27 + (1 - normalized) * 24);
      
      const pixelIndex = i * 4;
      data[pixelIndex] = r;     // Red
      data[pixelIndex + 1] = g; // Green
      data[pixelIndex + 2] = b; // Blue
      data[pixelIndex + 3] = 255; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert to blob
    return new Promise<Blob>((resolve) => {
      tempCanvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    }) as any; // Type assertion needed due to async nature
  }, []);

  // Download file helper
  const downloadFile = useCallback((content: string | Uint8Array | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!currentCanvas && frames.length === 0) {
      setExportStatus('No canvas data to export');
      return;
    }

    setIsExporting(true);
    setExportStatus('Preparing export...');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      if (selectedFormat === 'png') {
        // PNG export
        if (includeFrames && frames.length > 1) {
          setExportStatus('Generating PNG frames...');
          
          // Export each frame as PNG
          for (let i = 0; i < frames.length; i++) {
            const pngBlob = generatePNG(frames[i].canvas);
            const filename = `pixel-art-frame-${i.toString().padStart(3, '0')}-${timestamp}.png`;
            downloadFile(pngBlob, filename, 'image/png');
            
            setExportStatus(`Exported frame ${i + 1}/${frames.length}`);
            
            // Small delay to prevent browser freezing
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } else {
          // Single frame PNG
          const canvas = currentCanvas || frames[0]?.canvas;
          if (canvas) {
            const pngBlob = generatePNG(canvas);
            const filename = `pixel-art-${timestamp}.png`;
            downloadFile(pngBlob, filename, 'image/png');
          }
        }
      } else {
        // Other formats (binary, cpp, json)
        if (includeFrames && frames.length > 1) {
          setExportStatus('Generating multi-frame export...');
          
          if (selectedFormat === 'json') {
            // Combined JSON with all frames
            const exportData = {
              metadata: {
                width: frames[0].canvas.width,
                height: frames[0].canvas.height,
                frameCount: frames.length,
                exportedAt: new Date().toISOString(),
                format: '4-bit grayscale'
              },
              frames: frames.map((frame, index) => ({
                frameIndex: index,
                timestamp: frame.timestamp,
                data: Array.from(frame.canvas.data)
              }))
            };
            
            const jsonContent = JSON.stringify(exportData, null, 2);
            const filename = `pixel-art-animation-${timestamp}.json`;
            downloadFile(jsonContent, filename, 'application/json');
          } else {
            // Export each frame separately for binary/cpp
            for (let i = 0; i < frames.length; i++) {
              const exportData = pixelService.exportCanvas(selectedFormat, frames[i]);
              const extension = selectedFormat === 'binary' ? 'bin' : 'h';
              const filename = `pixel-art-frame-${i.toString().padStart(3, '0')}-${timestamp}.${extension}`;
              
              const mimeType = selectedFormat === 'binary' ? 'application/octet-stream' : 'text/plain';
              downloadFile(exportData, filename, mimeType);
              
              setExportStatus(`Exported frame ${i + 1}/${frames.length}`);
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        } else {
          // Single frame export
          const exportData = pixelService.exportCanvas(selectedFormat);
          const extension = selectedFormat === 'binary' ? 'bin' : selectedFormat === 'cpp' ? 'h' : 'json';
          const filename = `pixel-art-${timestamp}.${extension}`;
          
          const mimeType = {
            binary: 'application/octet-stream',
            cpp: 'text/plain',
            json: 'application/json'
          }[selectedFormat];
          
          downloadFile(exportData, filename, mimeType);
        }
      }

      setExportStatus('Export completed successfully!');
      
      // Clear status after 3 seconds
      setTimeout(() => setExportStatus(''), 3000);
      
    } catch (error) {
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, includeFrames, frames, currentCanvas, pixelService, downloadFile, generatePNG]);

  const hasMultipleFrames = frames.length > 1;
  const hasData = currentCanvas || frames.length > 0;

  return (
    <div className={`pixel-art-export ${className}`}>
      <div className="export-section">
        <h4>Export Settings</h4>
        
        <div className="export-options">
          <div className="format-selection">
            <label>Format:</label>
            <select 
              value={selectedFormat} 
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              disabled={isExporting}
            >
              <option value="cpp">C++ Header (.h)</option>
              <option value="binary">Binary Data (.bin)</option>
              <option value="json">JSON Data (.json)</option>
              <option value="png">PNG Image (.png)</option>
            </select>
          </div>

          {hasMultipleFrames && (
            <div className="frame-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeFrames}
                  onChange={(e) => setIncludeFrames(e.target.checked)}
                  disabled={isExporting}
                />
                Export all {frames.length} frames
              </label>
            </div>
          )}
        </div>

        <div className="export-info">
          {selectedFormat === 'cpp' && (
            <p>Exports as C++ header with uint8_t array, suitable for embedded applications.</p>
          )}
          {selectedFormat === 'binary' && (
            <p>Raw binary data format. Each byte represents one pixel (0-15 grayscale).</p>
          )}
          {selectedFormat === 'json' && (
            <p>Human-readable JSON format with metadata and pixel data arrays.</p>
          )}
          {selectedFormat === 'png' && (
            <p>PNG image with yellow tinting to match Eisei's OLED display aesthetic.</p>
          )}
        </div>

        <div className="export-actions">
          <button
            onClick={handleExport}
            disabled={!hasData || isExporting}
            className="btn btn-primary"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {exportStatus && (
          <div className={`export-status ${exportStatus.includes('failed') ? 'error' : exportStatus.includes('completed') ? 'success' : 'info'}`}>
            {exportStatus}
          </div>
        )}
      </div>

      <div className="export-info-section">
        <h4>Export Information</h4>
        <div className="export-details">
          <div className="detail-item">
            <span className="detail-label">Canvas Size:</span>
            <span className="detail-value">
              {currentCanvas ? `${currentCanvas.width}×${currentCanvas.height}` : 
               frames.length > 0 ? `${frames[0].canvas.width}×${frames[0].canvas.height}` : 'N/A'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Color Depth:</span>
            <span className="detail-value">4-bit (16 levels)</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Data Size:</span>
            <span className="detail-value">
              {hasData ? 
                `${currentCanvas?.data.length || frames[0]?.canvas.data.length || 0} bytes per frame` : 
                'N/A'}
            </span>
          </div>
          {hasMultipleFrames && (
            <div className="detail-item">
              <span className="detail-label">Frame Count:</span>
              <span className="detail-value">{frames.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};