// DRO Data Model Types

export interface SpectralFrame {
  bands: number[]; // 20-band spectral data
  timestamp: number; // Frame index
  metadata?: object; // Optional frame data
}

export interface Datum {
  frames: SpectralFrame[];
  sampleRate: number;
  frameCount: number;
  bandCount: number;
  name?: string;
  description?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface LuaScript {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number; // frames per second
  loop: boolean;
}

export interface EditorState {
  content: string;
  cursorPosition: number;
  selection: {
    start: number;
    end: number;
  } | null;
  hasErrors: boolean;
  errors: LuaError[];
}

export interface LuaError {
  message: string;
  line?: number;
  column?: number;
  type: 'syntax' | 'runtime' | 'api';
}

export interface VisualizationSettings {
  showGrid: boolean;
  showLabels: boolean;
  barWidth: number;
  maxHeight: number;
  colorScheme: 'amber' | 'rainbow' | 'grayscale';
}

export interface AppSettings {
  theme: 'amber' | 'green' | 'blue';
  autoSave: boolean;
  autoExecute: boolean;
  executionDelay: number; // milliseconds
  visualization: VisualizationSettings;
}

// Lua API types
export interface LuaAPI {
  createDatum: (frameCount: number, bandCount: number) => Datum;
  updateVisualization: (datum: Datum) => void;
  log: (message: string) => void;
  math: {
    sin: (x: number) => number;
    cos: (x: number) => number;
    pi: number;
    random: () => number;
  };
}

// Event types
export type AppEvent = 
  | { type: 'SCRIPT_EXECUTED'; payload: { datum: Datum; executionTime: number } }
  | { type: 'SCRIPT_ERROR'; payload: { errors: LuaError[] } }
  | { type: 'PLAYBACK_STARTED' }
  | { type: 'PLAYBACK_PAUSED' }
  | { type: 'PLAYBACK_STOPPED' }
  | { type: 'FRAME_CHANGED'; payload: { frameIndex: number } }
  | { type: 'SCRIPT_SAVED'; payload: { script: LuaScript } }
  | { type: 'SCRIPT_LOADED'; payload: { script: LuaScript } };

export type EventHandler<T extends AppEvent> = (event: T) => void; 