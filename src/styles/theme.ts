import type { ThemeName } from '../types/settings';

interface ThemeColors {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Text colors
  accent: string;
  accentDark: string;
  accentLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // UI colors
  border: string;
  borderMuted: string;
  success: string;
  error: string;
  warning: string;
  
  // Editor colors
  editorBackground: string;
  editorSelection: string;
  editorCursor: string;
  editorGutter: string;
  editorLineNumber: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  'gruvbox': {
    background: '#282828',
    backgroundSecondary: '#3c3836',
    backgroundTertiary: '#504945',
    accent: '#fabd2f',
    accentDark: '#d79921',
    accentLight: '#fe8019',
    textPrimary: '#ebdbb2',
    textSecondary: '#d5c4a1',
    textMuted: '#a89984',
    border: '#fabd2f',
    borderMuted: '#d79921',
    success: '#b8bb26',
    error: '#fb4934',
    warning: '#fe8019',
    editorBackground: '#282828',
    editorSelection: '#665c54',
    editorCursor: '#fabd2f',
    editorGutter: '#3c3836',
    editorLineNumber: '#928374',
  },
  'rose-pine': {
    background: '#191724',
    backgroundSecondary: '#1f1d2e',
    backgroundTertiary: '#26233a',
    accent: '#ebbcba',
    accentDark: '#eb6f92',
    accentLight: '#f6c177',
    textPrimary: '#e0def4',
    textSecondary: '#908caa',
    textMuted: '#6e6a86',
    border: '#ebbcba',
    borderMuted: '#eb6f92',
    success: '#9ccfd8',
    error: '#eb6f92',
    warning: '#f6c177',
    editorBackground: '#191724',
    editorSelection: '#403d52',
    editorCursor: '#ebbcba',
    editorGutter: '#1f1d2e',
    editorLineNumber: '#6e6a86',
  },
  'catppuccin': {
    background: '#1e1e2e',
    backgroundSecondary: '#313244',
    backgroundTertiary: '#45475a',
    accent: '#cba6f7',
    accentDark: '#a6adc8',
    accentLight: '#f5c2e7',
    textPrimary: '#cdd6f4',
    textSecondary: '#bac2de',
    textMuted: '#9399b2',
    border: '#cba6f7',
    borderMuted: '#a6adc8',
    success: '#a6e3a1',
    error: '#f38ba8',
    warning: '#fab387',
    editorBackground: '#1e1e2e',
    editorSelection: '#585b70',
    editorCursor: '#cba6f7',
    editorGutter: '#313244',
    editorLineNumber: '#7f849c',
  },
  'nord': {
    background: '#2e3440',
    backgroundSecondary: '#3b4252',
    backgroundTertiary: '#434c5e',
    accent: '#88c0d0',
    accentDark: '#5e81ac',
    accentLight: '#8fbcbb',
    textPrimary: '#eceff4',
    textSecondary: '#e5e9f0',
    textMuted: '#d8dee9',
    border: '#88c0d0',
    borderMuted: '#5e81ac',
    success: '#a3be8c',
    error: '#bf616a',
    warning: '#ebcb8b',
    editorBackground: '#2e3440',
    editorSelection: '#4c566a',
    editorCursor: '#88c0d0',
    editorGutter: '#3b4252',
    editorLineNumber: '#616e88',
  },
  'rose-pine-dawn': {
    background: '#faf4ed',
    backgroundSecondary: '#f2e9e1',
    backgroundTertiary: '#fffaf3',
    accent: '#d7827e',
    accentDark: '#b4637a',
    accentLight: '#ea9d34',
    textPrimary: '#575279',
    textSecondary: '#797593',
    textMuted: '#9893a5',
    border: '#d7827e',
    borderMuted: '#b4637a',
    success: '#56949f',
    error: '#b4637a',
    warning: '#ea9d34',
    editorBackground: '#faf4ed',
    editorSelection: '#f2e9e1',
    editorCursor: '#d7827e',
    editorGutter: '#f2e9e1',
    editorLineNumber: '#9893a5',
  },
  'jellyfish': {
    background: '#1e1a2d',
    backgroundSecondary: '#2a2541',
    backgroundTertiary: '#342f56',
    accent: '#a277ff',
    accentDark: '#8b61e6',
    accentLight: '#c29fff',
    textPrimary: '#f8f8f2',
    textSecondary: '#d0c8f0',
    textMuted: '#a69ac7',
    border: '#a277ff',
    borderMuted: '#8b61e6',
    success: '#50fa7b',
    error: '#ff5555',
    warning: '#f1fa8c',
    editorBackground: '#1e1a2d',
    editorSelection: '#44475a',
    editorCursor: '#a277ff',
    editorGutter: '#2a2541',
    editorLineNumber: '#6272a4',
  },
  'aura': {
    background: '#15141b',
    backgroundSecondary: '#1b1a23',
    backgroundTertiary: '#21202b',
    accent: '#a277ff',
    accentDark: '#8b61e6',
    accentLight: '#c29fff',
    textPrimary: '#edecee',
    textSecondary: '#c5c5c5',
    textMuted: '#9c9c9c',
    border: '#a277ff',
    borderMuted: '#8b61e6',
    success: '#61ffca',
    error: '#ff6767',
    warning: '#ffca85',
    editorBackground: '#15141b',
    editorSelection: '#3b3246',
    editorCursor: '#a277ff',
    editorGutter: '#1b1a23',
    editorLineNumber: '#6d6d6d',
  },
  'dobri': {
    background: '#202020',
    backgroundSecondary: '#2a2a2a',
    backgroundTertiary: '#363636',
    accent: '#0dbc79',
    accentDark: '#0a9962',
    accentLight: '#12d98a',
    textPrimary: '#f0f0f0',
    textSecondary: '#c0c0c0',
    textMuted: '#808080',
    border: '#0dbc79',
    borderMuted: '#0a9962',
    success: '#0dbc79',
    error: '#e74c3c',
    warning: '#f39c12',
    editorBackground: '#202020',
    editorSelection: '#404040',
    editorCursor: '#0dbc79',
    editorGutter: '#2a2a2a',
    editorLineNumber: '#606060',
  },
  'cute-pink-light': {
    background: '#fff5f8',
    backgroundSecondary: '#ffeef3',
    backgroundTertiary: '#ffe6ee',
    accent: '#ff69b4',
    accentDark: '#e91e7a',
    accentLight: '#ff85c1',
    textPrimary: '#2d1b2e',
    textSecondary: '#5d4c5e',
    textMuted: '#8d7c8e',
    border: '#ff69b4',
    borderMuted: '#e91e7a',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    editorBackground: '#fff5f8',
    editorSelection: '#ffeef3',
    editorCursor: '#ff69b4',
    editorGutter: '#ffeef3',
    editorLineNumber: '#bd9dbf',
  },
};

export const getTheme = (themeName: ThemeName) => ({
  colors: themes[themeName],
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
    glow: `0 0 8px ${themes[themeName].accent}33`,
    glowStrong: `0 0 16px ${themes[themeName].accent}80`,
  },
  
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
});

export type Theme = ReturnType<typeof getTheme>; 