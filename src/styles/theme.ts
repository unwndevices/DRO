// DRO Retro-Terminal Theme Configuration
export const theme = {
  colors: {
    // Background colors
    background: '#181818',
    backgroundSecondary: '#1e1e1e',
    backgroundTertiary: '#262626',
    
    // Text colors
    amber: '#FFBF00',
    amberDark: '#E6AC00',
    amberLight: '#FFD233',
    textPrimary: '#FFBF00',
    textSecondary: '#CCCCCC',
    textMuted: '#999999',
    
    // UI colors
    border: '#FFBF00',
    borderMuted: '#664D00',
    success: '#00FF00',
    error: '#FF4444',
    warning: '#FFAA00',
    
    // Editor colors
    editorBackground: '#181818',
    editorSelection: '#333300',
    editorCursor: '#FFBF00',
    editorGutter: '#262626',
    editorLineNumber: '#666666',
  },
  
  fonts: {
    mono: "'Fira Mono', 'Monaco', 'Consolas', 'Courier New', monospace",
    fallback: "monospace",
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  borderRadius: {
    none: '0px',
    sm: '2px',
    md: '4px',
  },
  
  shadows: {
    none: 'none',
    glow: '0 0 8px rgba(255, 191, 0, 0.3)',
    glowStrong: '0 0 16px rgba(255, 191, 0, 0.5)',
  },
  
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
} as const;

export type Theme = typeof theme; 