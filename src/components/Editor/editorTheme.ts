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
(baseHighlighter as { style: (tags: unknown) => unknown }).style = function(tags: unknown) {
  return originalStyle.call(this, tags || []);
};

export const amberSyntaxHighlighting = syntaxHighlighting(baseHighlighter);

export const amberEditorTheme = [
  amberTheme,
  amberSyntaxHighlighting
]; 