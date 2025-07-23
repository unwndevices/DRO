import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export const amberTheme = EditorView.theme({
  '&': {
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-background)',
    height: '100%',
    fontFamily: 'var(--font-mono)',
  },

  '.cm-content': {
    caretColor: 'var(--color-accent)',
    backgroundColor: 'var(--color-background)',
    padding: 'var(--spacing-md)',
  },

  '.cm-focused': {
    outline: 'none',
  },

  '.cm-editor': {
    backgroundColor: 'var(--color-background)',
  },

  '.cm-scroller': {
    backgroundColor: 'var(--color-background)',
  },

  '.cm-cursor, .cm-dropCursor': { 
    borderLeftColor: 'var(--color-accent)' 
  },
  
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { 
    backgroundColor: 'var(--color-editor-selection)' 
  },

  '.cm-activeLine': { 
    backgroundColor: 'var(--color-background-secondary)' 
  },
  
  '.cm-selectionMatch': { 
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.2)' 
  },

  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-tag-matching': {
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.2)',
    outline: '1px solid var(--color-accent)'
  },

  '.cm-gutters': {
    backgroundColor: 'var(--color-editor-gutter)',
    color: 'var(--color-editor-line-number)',
    border: 'none',
    margin: '0px 0px 0px 10px',
    borderRight: '1px solid var(--color-border-muted)'
  },

  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-background-secondary)',
    color: 'var(--color-text-primary)'
  },

  '.cm-lineNumbers .cm-gutterElement': {
    color: 'var(--color-editor-line-number)',
    fontSize: '0.9em'
  },

  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--color-background-tertiary)',
    border: '1px solid var(--color-border-muted)',
    color: 'var(--color-text-muted)'
  },

  // Code folding gutter styling
  '.cm-foldGutter': {
    width: '16px',
    color: 'var(--color-text-muted)',
  },

  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 4px',
    cursor: 'pointer',
  },

  '.cm-foldGutter .cm-gutterElement:hover': {
    color: 'var(--color-accent)',
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.1)',
  },

  // Lint gutter styling
  '.cm-lintGutter': {
    width: '16px',
    backgroundColor: 'var(--color-editor-gutter)',
  },

  '.cm-lintGutter .cm-gutterElement': {
    padding: '0 2px',
    cursor: 'pointer',
  },

  // Lint markers
  '.cm-lintPoint': {
    position: 'relative',
  },

  '.cm-lintPoint::after': {
    content: '●',
    position: 'absolute',
    left: '4px',
    top: '1px',
    fontSize: '8px',
    lineHeight: '1',
  },

  '.cm-lintPoint[data-severity="error"]::after': {
    color: 'var(--color-error)',
  },

  '.cm-lintPoint[data-severity="warning"]::after': {
    color: 'var(--color-warning)',
  },

  '.cm-lintPoint[data-severity="info"]::after': {
    color: '#5ea1ff', // blue for info
  },

  // Diagnostic underlines (squiggly lines)
  '.cm-diagnostic': {
    textDecoration: 'none',
    position: 'relative',
  },

  '.cm-diagnostic-error': {
    borderBottom: '2px wavy var(--color-error)',
  },

  '.cm-diagnostic-warning': {
    borderBottom: '2px wavy var(--color-warning)',
  },

  '.cm-diagnostic-info': {
    borderBottom: '2px wavy #5ea1ff',
  },

  // Lint tooltip styling
  '.cm-tooltip-lint': {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-border-muted)',
    borderRadius: 'var(--border-radius-md)',
    boxShadow: 'var(--shadow-glow)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    maxWidth: '400px',
    padding: '8px 12px',
    color: 'var(--color-text-primary)',
    lineHeight: '1.4',
  },

  '.cm-tooltip-lint .cm-diagnostic-error': {
    borderLeft: '3px solid var(--color-error)',
    paddingLeft: '8px',
    marginLeft: '4px',
  },

  '.cm-tooltip-lint .cm-diagnostic-warning': {
    borderLeft: '3px solid var(--color-warning)',
    paddingLeft: '8px',
    marginLeft: '4px',
  },

  '.cm-tooltip-lint .cm-diagnostic-info': {
    borderLeft: '3px solid #5ea1ff',
    paddingLeft: '8px',
    marginLeft: '4px',
  },

  // Lint panel styling (if using lint panel)
  '.cm-panel.cm-lint-panel': {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-border-muted)',
    borderRadius: 'var(--border-radius-md)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },

  '.cm-lint-panel .cm-diagnostic': {
    padding: '4px 8px',
    borderBottom: '1px solid rgba(var(--color-border-muted-rgb), 0.3)',
    cursor: 'pointer',
  },

  '.cm-lint-panel .cm-diagnostic:hover': {
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.1)',
  },

  '.cm-lint-panel .cm-diagnostic.cm-diagnostic-error': {
    color: 'var(--color-error)',
  },

  '.cm-lint-panel .cm-diagnostic.cm-diagnostic-warning': {
    color: 'var(--color-warning)',
  },

  '.cm-lint-panel .cm-diagnostic.cm-diagnostic-info': {
    color: '#5ea1ff',
  },

  // Autocompletion popup styling
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--border-radius-md)',
    boxShadow: 'var(--shadow-glow)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    maxHeight: '300px',
    minWidth: '250px',
  },

  '.cm-tooltip-autocomplete > ul': {
    margin: '0',
    padding: '4px 0',
    listStyle: 'none',
    maxHeight: '280px',
    overflowY: 'auto',
  },

  '.cm-tooltip-autocomplete > ul > li': {
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid rgba(var(--color-border-muted-rgb), 0.3)',
  },

  '.cm-tooltip-autocomplete > ul > li:last-child': {
    borderBottom: 'none',
  },

  '.cm-tooltip-autocomplete > ul > li:hover, .cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.15)',
    color: 'var(--color-accent)',
  },

  '.cm-completionLabel': {
    flex: '1',
    fontWeight: '500',
    color: 'inherit',
  },

  '.cm-completionDetail': {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    marginLeft: '8px',
  },

  '.cm-completionInfo': {
    backgroundColor: 'var(--color-background-tertiary)',
    border: '1px solid var(--color-border-muted)',
    borderRadius: 'var(--border-radius-sm)',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
    maxWidth: '300px',
    lineHeight: '1.4',
  },

  // Different completion types styling
  '.cm-completionIcon': {
    width: '16px',
    height: '16px',
    marginRight: '8px',
    display: 'inline-block',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '2px',
    lineHeight: '16px',
  },

  '.cm-completionIcon-function': {
    backgroundColor: '#5eff6c',
    color: '#000',
  },

  '.cm-completionIcon-variable': {
    backgroundColor: '#5ea1ff',
    color: '#000',
  },

  '.cm-completionIcon-constant': {
    backgroundColor: '#5ef1ff',
    color: '#000',
  },

  '.cm-completionIcon-keyword': {
    backgroundColor: '#bd5eff',
    color: '#fff',
  },

  // Search match highlighting
  '.cm-searchMatch': {
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.3)',
    outline: '1px solid var(--color-accent)',
  },

  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.5)',
  },

  // Panel styling for search, etc.
  '.cm-panels': {
    backgroundColor: 'var(--color-background-secondary)',
    color: 'var(--color-text-primary)',
    borderTop: '1px solid var(--color-border-muted)',
  },

  '.cm-panel': {
    padding: '8px',
  },

  '.cm-panel input': {
    backgroundColor: 'var(--color-background-tertiary)',
    border: '1px solid var(--color-border-muted)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--color-text-primary)',
    padding: '4px 8px',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
  },

  '.cm-panel input:focus': {
    borderColor: 'var(--color-accent)',
    outline: 'none',
    boxShadow: '0 0 0 2px rgba(var(--color-glow-rgb), 0.2)',
  },

  '.cm-panel button': {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-background)',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    padding: '4px 8px',
    marginLeft: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },

  '.cm-panel button:hover': {
    backgroundColor: 'var(--color-accent-light)',
  },

}, { dark: true });


import { getTheme } from '../../styles/theme';
import type { ThemeName } from '../../types/settings';

// Create theme-aware syntax highlighting
export const createSyntaxHighlighting = (themeName: ThemeName) => {
  const theme = getTheme(themeName);
  
  // Define syntax colors based on the theme
  let syntaxColors;
  
  switch (themeName) {
    case 'gruvbox':
      syntaxColors = {
        keyword: '#fb4934',     // red
        variable: '#83a598',    // blue
        function: '#b8bb26',    // green
        string: '#fabd2f',      // yellow
        number: '#d3869b',      // purple
        bool: '#fe8019',        // orange
        comment: '#928374',     // gray
        operator: '#fb4934',    // red
        punctuation: theme.colors.textSecondary,
        property: '#8ec07c',    // aqua
        className: '#d3869b',   // purple
      };
      break;
    case 'rose-pine':
      syntaxColors = {
        keyword: '#eb6f92',     // love
        variable: '#9ccfd8',    // foam
        function: '#f6c177',    // gold
        string: '#ebbcba',      // rose
        number: '#c4a7e7',      // iris
        bool: '#eb6f92',        // love
        comment: '#6e6a86',     // muted
        operator: '#eb6f92',    // love
        punctuation: theme.colors.textSecondary,
        property: '#9ccfd8',    // foam
        className: '#c4a7e7',   // iris
      };
      break;
    case 'catppuccin':
      syntaxColors = {
        keyword: '#cba6f7',     // mauve
        variable: '#89b4fa',    // blue
        function: '#a6e3a1',    // green
        string: '#f9e2af',      // yellow
        number: '#fab387',      // peach
        bool: '#f5c2e7',        // pink
        comment: '#6c7086',     // overlay1
        operator: '#f38ba8',    // red
        punctuation: theme.colors.textSecondary,
        property: '#94e2d5',    // teal
        className: '#cba6f7',   // mauve
      };
      break;
    case 'nord':
      syntaxColors = {
        keyword: '#81a1c1',     // nord9
        variable: '#8fbcbb',    // nord7
        function: '#88c0d0',    // nord8
        string: '#a3be8c',      // nord14
        number: '#b48ead',      // nord15
        bool: '#d08770',        // nord12
        comment: '#616e88',     // nord3
        operator: '#bf616a',    // nord11
        punctuation: theme.colors.textSecondary,
        property: '#8fbcbb',    // nord7
        className: '#b48ead',   // nord15
      };
      break;
    case 'rose-pine-dawn':
      syntaxColors = {
        keyword: '#b4637a',     // love
        variable: '#56949f',    // foam
        function: '#ea9d34',    // gold
        string: '#d7827e',      // rose
        number: '#907aa9',      // iris
        bool: '#b4637a',        // love
        comment: '#9893a5',     // muted
        operator: '#b4637a',    // love
        punctuation: theme.colors.textSecondary,
        property: '#56949f',    // foam
        className: '#907aa9',   // iris
      };
      break;
    case 'jellyfish':
      syntaxColors = {
        keyword: '#ff79c6',     // pink
        variable: '#8be9fd',    // cyan
        function: '#50fa7b',    // green
        string: '#f1fa8c',      // yellow
        number: '#bd93f9',      // purple
        bool: '#ff79c6',        // pink
        comment: '#6272a4',     // comment
        operator: '#ff5555',    // red
        punctuation: theme.colors.textSecondary,
        property: '#ffb86c',    // orange
        className: '#bd93f9',   // purple
      };
      break;
    case 'aura':
      syntaxColors = {
        keyword: '#a277ff',     // purple
        variable: '#61ffca',    // mint
        function: '#ffca85',    // orange
        string: '#a277ff',      // purple
        number: '#ff6767',      // red
        bool: '#a277ff',        // purple
        comment: '#6d6d6d',     // gray
        operator: '#ff6767',    // red
        punctuation: theme.colors.textSecondary,
        property: '#61ffca',    // mint
        className: '#a277ff',   // purple
      };
      break;
    case 'dobri':
      syntaxColors = {
        keyword: '#0dbc79',     // green
        variable: '#12d98a',    // light green
        function: '#0dbc79',    // green
        string: '#f39c12',      // orange
        number: '#e74c3c',      // red
        bool: '#0dbc79',        // green
        comment: '#606060',     // gray
        operator: '#e74c3c',    // red
        punctuation: theme.colors.textSecondary,
        property: '#12d98a',    // light green
        className: '#0dbc79',   // green
      };
      break;
    case 'cute-pink-light':
      syntaxColors = {
        keyword: '#e91e7a',     // dark pink
        variable: '#8b5cf6',    // purple
        function: '#22c55e',    // green
        string: '#f59e0b',      // amber
        number: '#ef4444',      // red
        bool: '#e91e7a',        // dark pink
        comment: '#8d7c8e',     // muted
        operator: '#ef4444',    // red
        punctuation: theme.colors.textSecondary,
        property: '#8b5cf6',    // purple
        className: '#e91e7a',   // dark pink
      };
      break;
    default:
      syntaxColors = {
        keyword: theme.colors.accent,
        variable: theme.colors.textPrimary,
        function: theme.colors.success,
        string: theme.colors.warning,
        number: theme.colors.accent,
        bool: theme.colors.accent,
        comment: theme.colors.textMuted,
        operator: theme.colors.error,
        punctuation: theme.colors.textSecondary,
        property: theme.colors.accent,
        className: theme.colors.accent,
      };
  }
  
  const highlighter = HighlightStyle.define([
    { tag: t.keyword, color: syntaxColors.keyword },
    { tag: [t.name, t.variableName], color: syntaxColors.variable },
    { tag: t.function(t.variableName), color: syntaxColors.function },
    { tag: t.string, color: syntaxColors.string },
    { tag: t.number, color: syntaxColors.number },
    { tag: t.bool, color: syntaxColors.bool },
    { tag: t.comment, color: syntaxColors.comment, fontStyle: 'italic' },
    { tag: t.operator, color: syntaxColors.operator },
    { tag: t.punctuation, color: syntaxColors.punctuation },
    { tag: t.propertyName, color: syntaxColors.property },
    { tag: t.className, color: syntaxColors.className },
    { tag: t.invalid, color: 'var(--color-error)' },
  ]);

  // Apply workaround for "tags is not iterable" error with legacy modes
  const originalStyle = highlighter.style;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (highlighter as { style: (tags: any) => any }).style = function(tags: any) {
    return originalStyle.call(this, tags || []);
  };

  return syntaxHighlighting(highlighter);
};

// Default syntax highlighting (for backward compatibility)
export const amberSyntaxHighlighting = createSyntaxHighlighting('gruvbox');

// Create complete theme-aware editor theme
export const createEditorTheme = (themeName: ThemeName) => [
  amberTheme,
  createSyntaxHighlighting(themeName)
];

// Default editor theme (for backward compatibility)
export const amberEditorTheme = createEditorTheme('gruvbox'); 