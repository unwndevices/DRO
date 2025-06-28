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
    caretColor: 'var(--color-amber)',
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
    borderLeftColor: 'var(--color-amber)' 
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
    outline: '1px solid var(--color-amber)'
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
    color: 'var(--color-amber)',
    backgroundColor: 'rgba(var(--color-glow-rgb), 0.1)',
  },

  // Autocompletion popup styling
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-amber)',
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
    color: 'var(--color-amber)',
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
    outline: '1px solid var(--color-amber)',
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
    borderColor: 'var(--color-amber)',
    outline: 'none',
    boxShadow: '0 0 0 2px rgba(var(--color-glow-rgb), 0.2)',
  },

  '.cm-panel button': {
    backgroundColor: 'var(--color-amber)',
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
    backgroundColor: 'var(--color-amber-light)',
  },

}, { dark: true });


// Create the base highlighter using cyberdream.nvim color palette
const baseHighlighter = HighlightStyle.define([
  { tag: t.keyword, color: '#bd5eff' }, // purple
  { tag: [t.name, t.variableName], color: '#5ea1ff' }, // blue
  { tag: t.function(t.variableName), color: '#5eff6c' }, // green for functions
  { tag: t.string, color: '#f1ff5e' }, // yellow
  { tag: t.number, color: '#5ef1ff' }, // cyan
  { tag: t.bool, color: '#ff5ea0' }, // pink
  { tag: t.comment, color: '#7b8496', fontStyle: 'italic' }, // grey
  { tag: t.operator, color: '#ff5555' }, // red
  { tag: t.punctuation, color: '#ffffff' }, // white
  { tag: t.propertyName, color: '#ffbd5e' }, // orange
  { tag: t.className, color: '#ff5ef1' }, // magenta
  { tag: t.invalid, color: 'var(--color-error)' },
]);

// Apply workaround for "tags is not iterable" error with legacy modes
const originalStyle = baseHighlighter.style;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(baseHighlighter as { style: (tags: any) => any }).style = function(tags: any) {
  return originalStyle.call(this, tags || []);
};

export const amberSyntaxHighlighting = syntaxHighlighting(baseHighlighter);

export const amberEditorTheme = [
  amberTheme,
  amberSyntaxHighlighting
]; 