import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PixelArtCanvas } from './PixelArtCanvas';
import type { PixelArtFrame, PixelCanvas } from '../../services/PixelArt/LuaPixelService';
import './PixelArtPreview.css';

interface PixelArtPreviewProps {
  frames: PixelArtFrame[];
  currentCanvas?: PixelCanvas;
  className?: string;
  showAnimation?: boolean;
  animationSpeed?: number; // milliseconds per frame
}

type PlaybackMode = 'forward' | 'backward' | 'pingpong';

export const PixelArtPreview: React.FC<PixelArtPreviewProps> = ({
  frames,
  currentCanvas,
  className = '',
  showAnimation = false,
  animationSpeed = 100
}) => {
  const [zoomLevel, setZoomLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-preview-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.zoomLevel || 1;
      }
    } catch (error) {
      console.warn('DROP: Failed to load pixel preview settings:', error);
    }
    return 1;
  });
  const [showGrid, setShowGrid] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-preview-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.showGrid || false;
      }
    } catch (error) {
      console.warn('DROP: Failed to load pixel preview settings:', error);
    }
    return false;
  });
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-preview-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.isPlaying || false;
      }
    } catch (error) {
      console.warn('DROP: Failed to load pixel preview settings:', error);
    }
    return false;
  });
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-preview-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.playbackMode || 'forward';
      }
    } catch (error) {
      console.warn('DROP: Failed to load pixel preview settings:', error);
    }
    return 'forward';
  });
  const [pingPongDirection, setPingPongDirection] = useState(1); // 1 for forward, -1 for backward
  const [currentAnimationSpeed, setCurrentAnimationSpeed] = useState(animationSpeed);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const previewRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Get the canvas to display
  // When animation is enabled, always show the canvas corresponding to the current animation frame.
  // Otherwise, fall back to the provided currentCanvas (single-frame render) or the first available frame.
  const displayCanvas = showAnimation
    ? (frames.length > 0 ? frames[currentFrameIndex]?.canvas : null)
    : (currentCanvas || (frames.length > 0 ? frames[currentFrameIndex]?.canvas : null));

  // Reset frame index when new frames are generated, but don't auto-play
  useEffect(() => {
    if (frames.length > 1 && showAnimation) {
      setCurrentFrameIndex(0);
      setIsPlaying(false); // Don't auto-play
    }
  }, [frames.length, showAnimation]);

  // Calculate if canvas overflows viewport
  const calculateCanvasOverflow = useCallback(() => {
    if (!previewRef.current || !displayCanvas) return { overflowX: false, overflowY: false };

    const viewport = previewRef.current;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    // Canvas dimensions with zoom
    const canvasWidth = displayCanvas.width * zoomLevel;
    const canvasHeight = displayCanvas.height * zoomLevel;

    return {
      overflowX: canvasWidth > viewportWidth,
      overflowY: canvasHeight > viewportHeight,
      viewportWidth,
      viewportHeight,
      canvasWidth,
      canvasHeight
    };
  }, [displayCanvas, zoomLevel]);

  // Auto-save preview settings whenever they change
  useEffect(() => {
    const settings = {
      zoomLevel,
      showGrid,
      isPlaying,
      playbackMode,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('drop-pixel-preview-settings', JSON.stringify(settings));
  }, [zoomLevel, showGrid, isPlaying, playbackMode]);

  // Center canvas when zoom changes or when it fits in viewport
  useEffect(() => {
    const overflow = calculateCanvasOverflow();

    // If canvas fits in viewport, center it
    if (!overflow.overflowX && !overflow.overflowY) {
      setPanOffset({ x: 0, y: 0 });
    } else {
      // Adjust pan to keep canvas within bounds
      setPanOffset((prev: { x: number, y: number }) => {
        let newX = prev.x;
        let newY = prev.y;

        if (overflow.overflowX && overflow.canvasWidth && overflow.viewportWidth) {
          const maxPanX = (overflow.canvasWidth - overflow.viewportWidth) / 2;
          newX = Math.max(-maxPanX, Math.min(maxPanX, prev.x));
        } else {
          newX = 0;
        }

        if (overflow.overflowY && overflow.canvasHeight && overflow.viewportHeight) {
          const maxPanY = (overflow.canvasHeight - overflow.viewportHeight) / 2;
          newY = Math.max(-maxPanY, Math.min(maxPanY, prev.y));
        } else {
          newY = 0;
        }

        return { x: newX, y: newY };
      });
    }
  }, [zoomLevel, displayCanvas, calculateCanvasOverflow]);

  // Animation controls with different playback modes
  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      const animate = () => {
        setCurrentFrameIndex((prev: number) => {
          let nextIndex = prev;

          switch (playbackMode) {
            case 'forward':
              nextIndex = (prev + 1) % frames.length;
              break;

            case 'backward':
              nextIndex = prev - 1;
              if (nextIndex < 0) nextIndex = frames.length - 1;
              break;

            case 'pingpong':
              nextIndex = prev + pingPongDirection;

              // Check if we need to reverse direction
              if (nextIndex >= frames.length - 1) {
                nextIndex = frames.length - 1;
                setPingPongDirection(-1);
              } else if (nextIndex <= 0) {
                nextIndex = 0;
                setPingPongDirection(1);
              }
              break;
          }

          return nextIndex;
        });

        animationRef.current = setTimeout(animate, currentAnimationSpeed);
      };

      animationRef.current = setTimeout(animate, currentAnimationSpeed);

      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    }
  }, [isPlaying, frames.length, currentAnimationSpeed, playbackMode, pingPongDirection]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev: number) => Math.min(8, prev + 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev: number) => Math.max(1, prev - 1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Pan controls
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 0) { // Left click only
      setIsDragging(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      const overflow = calculateCanvasOverflow();

      // Only allow panning if canvas overflows viewport
      if (!overflow.overflowX && !overflow.overflowY) return;

      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;

      setPanOffset((prev: { x: number, y: number }) => {
        let newX = prev.x;
        let newY = prev.y;

        // Only update X if there's horizontal overflow
        if (overflow.overflowX && overflow.canvasWidth && overflow.viewportWidth) {
          newX = prev.x + deltaX;
          // Limit panning to keep canvas edges visible
          const maxPanX = (overflow.canvasWidth - overflow.viewportWidth) / 2;
          newX = Math.max(-maxPanX, Math.min(maxPanX, newX));
        }

        // Only update Y if there's vertical overflow
        if (overflow.overflowY && overflow.canvasHeight && overflow.viewportHeight) {
          newY = prev.y + deltaY;
          // Limit panning to keep canvas edges visible
          const maxPanY = (overflow.canvasHeight - overflow.viewportHeight) / 2;
          newY = Math.max(-maxPanY, Math.min(maxPanY, newY));
        }

        return { x: newX, y: newY };
      });

      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging, lastMousePos, calculateCanvasOverflow]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target !== document.body) return; // Only when not in input fields

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
          event.preventDefault();
          handleZoomReset();
          break;
        case ' ':
          event.preventDefault();
          if (frames.length > 1) {
            setIsPlaying((prev: boolean) => !prev);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentFrameIndex((prev: number) => Math.max(0, prev - 1));
          setIsPlaying(false);
          break;
        case 'ArrowRight':
          event.preventDefault();
          setCurrentFrameIndex((prev: number) => Math.min(frames.length - 1, prev + 1));
          setIsPlaying(false);
          break;
        case 'g':
          event.preventDefault();
          setShowGrid((prev: boolean) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset, frames.length]);

  // Animation controls
  const handlePlayPause = useCallback(() => {
    if (frames.length > 1) {
      setIsPlaying((prev: boolean) => !prev);
    }
  }, [frames.length]);

  const handleFrameSelect = useCallback((frameIndex: number) => {
    setCurrentFrameIndex(frameIndex);
    setIsPlaying(false);
  }, []);

  // Timeline scrubbing
  const handleTimelineClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (frames.length <= 1) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const frameIndex = Math.floor(progress * frames.length);

    handleFrameSelect(Math.min(frameIndex, frames.length - 1));
  }, [frames.length, handleFrameSelect]);

  const handleTimelineDrag = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 1) { // Left mouse button is pressed
      handleTimelineClick(event);
    }
  }, [handleTimelineClick]);

  if (!displayCanvas) {
    return (
      <div className={`pixel-art-preview ${className}`}>
        <div className="preview-placeholder">
          <div className="placeholder-icon">🎨</div>
          <h3>No Canvas Data</h3>
          <p>Execute a Lua script to see the pixel art preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pixel-art-preview ${className}`}>
      {/* Controls */}
      <div className="preview-controls">
        <div className="zoom-controls">
          <button onClick={handleZoomOut} disabled={zoomLevel <= 1} className="btn btn-sm">
            −
          </button>
          <span className="zoom-display">{zoomLevel}×</span>
          <button onClick={handleZoomIn} disabled={zoomLevel >= 8} className="btn btn-sm">
            +
          </button>
          <button onClick={handleZoomReset} className="btn btn-sm btn-secondary">
            Reset
          </button>
        </div>

        <div className="view-controls">
          <label className="grid-toggle">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Grid
          </label>
        </div>

      </div>

      {/* Canvas viewport */}
      <div
        ref={previewRef}
        className={`preview-viewport ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: (() => {
            const overflow = calculateCanvasOverflow();
            if (isDragging) return 'grabbing';
            if (overflow.overflowX || overflow.overflowY) return 'grab';
            return 'default';
          })()
        }}
      >
        <div
          className="canvas-container"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center'
          }}
        >
          <PixelArtCanvas
            canvas={displayCanvas}
            pixelSize={1}
            showGrid={showGrid}
            gridSpacing={Math.max(4, Math.floor(8 / zoomLevel))}
            interactionMode="view"
          />
        </div>
      </div>

      {/* Video editor timeline */}
      {frames.length > 1 && (
        <div className="video-timeline">
          <div className="timeline-header">
            <span className="timeline-label">Timeline</span>
            <div className="timeline-controls">
              <button onClick={handlePlayPause} className="btn btn-sm btn-primary">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <span className="frame-display">
                {currentFrameIndex + 1} / {frames.length}
              </span>
              <div className="playback-mode-control">
                <label htmlFor="playback-mode">Mode:</label>
                <select
                  id="playback-mode"
                  value={playbackMode}
                  onChange={(e) => setPlaybackMode(e.target.value as PlaybackMode)}
                  className="playback-mode-select"
                >
                  <option value="forward">Forward</option>
                  <option value="backward">Backward</option>
                  <option value="pingpong">Ping-Pong</option>
                </select>
              </div>
              <div className="speed-control">
                <label htmlFor="speed-input">Speed:</label>
                <input
                  id="speed-input"
                  type="number"
                  min="25"
                  max="500"
                  step="25"
                  value={currentAnimationSpeed}
                  onChange={(e) => setCurrentAnimationSpeed(parseInt(e.target.value) || 100)}
                  className="speed-input"
                />
                <span className="speed-unit">ms</span>
              </div>
            </div>
          </div>
          <div
            className="timeline-scrubber"
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineDrag}
            onMouseDown={handleTimelineClick}
          >
            <div className="timeline-track">
              {/* Frame markers */}
              {frames.map((_, index) => {
                const position = frames.length > 1
                  ? (index / (frames.length - 1)) * 100
                  : 50; // Center single frame
                return (
                  <div
                    key={index}
                    className="timeline-marker"
                    style={{ left: `${position}%` }}
                    title={`Frame ${index + 1}`}
                  />
                );
              })}

              {/* Progress bar */}
              <div
                className="timeline-progress"
                style={{
                  width: frames.length > 1
                    ? `${(currentFrameIndex / (frames.length - 1)) * 100}%`
                    : '100%'
                }}
              />

              {/* Playhead */}
              <div
                className="timeline-playhead"
                style={{
                  left: frames.length > 1
                    ? `${(currentFrameIndex / (frames.length - 1)) * 100}%`
                    : '50%'
                }}
              >
                <div className="playhead-handle" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="preview-shortcuts">
        <span>+/- Zoom</span>
        <span>•</span>
        <span>0 Reset</span>
        <span>•</span>
        <span>G Grid</span>
        {frames.length > 1 && (
          <>
            <span>•</span>
            <span>Space Play</span>
            <span>•</span>
            <span>← → Frames</span>
          </>
        )}
        <span>•</span>
        <span>Drag to pan</span>
      </div>
    </div>
  );
};