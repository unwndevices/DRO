import React, { useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { autocompletion, completionKeymap, CompletionContext } from '@codemirror/autocomplete';
import { foldGutter, codeFolding } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { lintGutter } from '@codemirror/lint';
import { createEditorTheme } from '../Editor/editorTheme';
import { pixelArtLuaLinter } from '../Editor/pixelArtLinter';
import { useSettings } from '../../contexts/SettingsContext';
import '../Editor/CodeEditor.css';

// Pixel Art specific globals completion
const pixelArtGlobalsCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  const options = [
    {
      label: 'f',
      type: 'variable',
      info: 'Current frame number (0 to frameCount-1)',
      detail: 'number'
    },
    {
      label: 'f_amt',
      type: 'variable',
      info: 'Total number of frames in animation',
      detail: 'number'
    },
    {
      label: 'canvas_width',
      type: 'variable',
      info: 'Canvas width in pixels (configurable)',
      detail: 'number'
    },
    {
      label: 'canvas_height',
      type: 'variable',
      info: 'Canvas height in pixels (configurable)',
      detail: 'number'
    },
    // Graphics API functions
    {
      label: 'graphics.setColor',
      type: 'function',
      info: 'Set drawing color (0.0-1.0 for grayscale)',
      detail: 'graphics.setColor(gray)'
    },
    {
      label: 'graphics.circle',
      type: 'function',
      info: 'Draw a circle',
      detail: 'graphics.circle(mode, x, y, radius)'
    },
    {
      label: 'graphics.rectangle',
      type: 'function',
      info: 'Draw a rectangle',
      detail: 'graphics.rectangle(mode, x, y, width, height)'
    },
    {
      label: 'graphics.line',
      type: 'function',
      info: 'Draw a line',
      detail: 'graphics.line(x1, y1, x2, y2)'
    },
    {
      label: 'graphics.print',
      type: 'function',
      info: 'Print text to canvas',
      detail: 'graphics.print(text, x, y)'
    },
    {
      label: 'graphics.clear',
      type: 'function',
      info: 'Clear canvas with color',
      detail: 'graphics.clear(gray)'
    },
    {
      label: 'graphics.getWidth',
      type: 'function',
      info: 'Get canvas width',
      detail: 'graphics.getWidth()'
    },
    {
      label: 'graphics.getHeight',
      type: 'function',
      info: 'Get canvas height',
      detail: 'graphics.getHeight()'
    },
    // Primitive functions
    {
      label: 'setPixel',
      type: 'function',
      info: 'Set individual pixel (0-15 grayscale)',
      detail: 'setPixel(x, y, value)'
    },
    {
      label: 'getPixel',
      type: 'function',
      info: 'Get individual pixel value',
      detail: 'getPixel(x, y)'
    },
    {
      label: 'circle',
      type: 'function',
      info: 'Draw circle primitive',
      detail: 'circle(x, y, radius, value, filled)'
    },
    {
      label: 'rect',
      type: 'function',
      info: 'Draw rectangle primitive',
      detail: 'rect(x, y, width, height, value, filled)'
    },
    {
      label: 'line',
      type: 'function',
      info: 'Draw line primitive',
      detail: 'line(x1, y1, x2, y2, value)'
    }
  ];

  return {
    from: word.from,
    options
  };
};

// Dynamic local variables completion for pixel art
const pixelArtLocalVariablesCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  // Get the full document text
  const doc = context.state.doc;
  const fullText = doc.toString();
  const currentPos = context.pos;

  // Extract local variables declared before current position
  const beforeText = fullText.substring(0, currentPos);
  const localVars = new Set<string>();

  // Match local variable declarations: local varname, local var1, var2
  const localVarRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  let match;

  while ((match = localVarRegex.exec(beforeText)) !== null) {
    // Split comma-separated variables
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }

  // Match function parameters: function name(param1, param2)
  const functionParamRegex = /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/g;
  while ((match = functionParamRegex.exec(beforeText)) !== null) {
    if (match[1].trim()) {
      const params = match[1].split(',').map(p => p.trim());
      params.forEach(param => {
        if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          localVars.add(param);
        }
      });
    }
  }

  // Match anonymous function parameters: function(param1, param2)
  const anonFunctionRegex = /function\s*\(([^)]*)\)/g;
  while ((match = anonFunctionRegex.exec(beforeText)) !== null) {
    if (match[1].trim()) {
      const params = match[1].split(',').map(p => p.trim());
      params.forEach(param => {
        if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          localVars.add(param);
        }
      });
    }
  }

  // Match for loop variables: for i=1,10 do, for k,v in pairs() do
  const forLoopRegex = /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g;
  while ((match = forLoopRegex.exec(beforeText)) !== null) {
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }

  // Convert to completion options
  const options = Array.from(localVars).map(varName => ({
    label: varName,
    type: 'variable',
    info: 'Local variable',
    detail: 'local'
  }));

  // Filter based on what user is typing
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().startsWith(word.text.toLowerCase())
  );

  return filteredOptions.length > 0 ? {
    from: word.from,
    options: filteredOptions
  } : null;
};

// Lua standard library completion for pixel art
const pixelArtStdLibCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/[\w.]*$/);
  if (!word) return null;

  const options = [
    // Math functions commonly used in pixel art
    { label: 'math.sin', type: 'function', info: 'Sine function for wave patterns', detail: 'math.sin(x)' },
    { label: 'math.cos', type: 'function', info: 'Cosine function for circular patterns', detail: 'math.cos(x)' },
    { label: 'math.tan', type: 'function', info: 'Returns the tangent of x (in radians)', detail: 'math.tan(x)' },
    { label: 'math.pi', type: 'constant', info: 'Pi constant (3.14159...)', detail: 'number' },
    { label: '^', type: 'operator', info: 'Exponentiation operator: base^exponent', detail: '(base)^(exponent)' },
    { label: 'math.exp', type: 'function', info: 'Returns e^x', detail: 'math.exp(x)' },
    { label: 'math.log', type: 'function', info: 'Returns the natural logarithm of x', detail: 'math.log(x)' },
    { label: 'math.floor', type: 'function', info: 'Round down to integer', detail: 'math.floor(x)' },
    { label: 'math.ceil', type: 'function', info: 'Round up to integer', detail: 'math.ceil(x)' },
    { label: 'math.abs', type: 'function', info: 'Absolute value', detail: 'math.abs(x)' },
    { label: 'math.max', type: 'function', info: 'Maximum value', detail: 'math.max(x, ...)' },
    { label: 'math.min', type: 'function', info: 'Minimum value', detail: 'math.min(x, ...)' },
    { label: 'math.sqrt', type: 'function', info: 'Square root', detail: 'math.sqrt(x)' },
    { label: 'math.random', type: 'function', info: 'Random number', detail: 'math.random([m [, n]])' },

    // String functions
    { label: 'tostring', type: 'function', info: 'Convert to string', detail: 'tostring(value)' },
    { label: 'tonumber', type: 'function', info: 'Convert to number', detail: 'tonumber(str)' },
    { label: 'print', type: 'function', info: 'Prints values to output', detail: 'print(...)' },
    { label: 'type', type: 'function', info: 'Returns the type of its argument', detail: 'type(v)' },

    // Control structures
    { label: 'function', type: 'keyword', info: 'Defines a function', detail: 'function name() end' },
    { label: 'local', type: 'keyword', info: 'Declares a local variable', detail: 'local var = value' },
    { label: 'if', type: 'keyword', info: 'Conditional statement', detail: 'if condition then end' },
    { label: 'then', type: 'keyword', info: 'Part of if statement', detail: 'if condition then' },
    { label: 'else', type: 'keyword', info: 'Else clause', detail: 'else' },
    { label: 'elseif', type: 'keyword', info: 'Else if clause', detail: 'elseif condition then' },
    { label: 'end', type: 'keyword', info: 'Ends a block', detail: 'end' },
    { label: 'for', type: 'keyword', info: 'For loop', detail: 'for i=1,10 do end' },
    { label: 'while', type: 'keyword', info: 'While loop', detail: 'while condition do end' },
    { label: 'do', type: 'keyword', info: 'Start of do block', detail: 'do' },
    { label: 'return', type: 'keyword', info: 'Returns from function', detail: 'return value' },
    { label: 'true', type: 'constant', info: 'Boolean true value', detail: 'boolean' },
    { label: 'false', type: 'constant', info: 'Boolean false value', detail: 'boolean' },
    { label: 'nil', type: 'constant', info: 'Nil value', detail: 'nil' }
  ];

  return {
    from: word.from,
    options: options.filter(option =>
      option.label.toLowerCase().includes(word.text.toLowerCase())
    )
  };
};

interface PixelArtCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: (code: string) => void;
  onClear?: () => void;
  onExport?: () => void;
  errors?: Array<{
    message: string;
    line?: number;
  }>;
  className?: string;
  frameCount: number;
  onFrameCountChange: (count: number) => void;
  canvasWidth: number;
  onCanvasWidthChange: (width: number) => void;
  canvasHeight: number;
  onCanvasHeightChange: (height: number) => void;
  isExecuting?: boolean;
  canExport?: boolean;
}

export const PixelArtCodeEditor: React.FC<PixelArtCodeEditorProps> = ({
  value,
  onChange,
  onExecute,
  onClear,
  onExport,
  errors = [],
  className = '',
  frameCount,
  onFrameCountChange,
  canvasWidth,
  onCanvasWidthChange,
  canvasHeight,
  onCanvasHeightChange,
  isExecuting = false,
  canExport = false,
}) => {
  const { settings } = useSettings();
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);

  const handleExecute = useCallback(() => {
    if (onExecute) {
      const startTime = performance.now();
      onExecute(value);
      setLastExecutionTime(performance.now() - startTime);
    }
  }, [onExecute, value]);

  const onEditorChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);

  const runKeymap = Prec.high(keymap.of([{
    key: 'Ctrl-Enter',
    mac: 'Cmd-Enter',
    preventDefault: true,
    run: () => {
      handleExecute();
      return true;
    },
  }]));

  return (
    <div className={`drop-code-editor ${className}`}>
      <div className="drop-editor-container">
        <CodeMirror
          value={value}
          height="100%"
          extensions={[
            StreamLanguage.define(lua),
            lineNumbers(),
            highlightActiveLineGutter(),
            foldGutter(),
            codeFolding(),
            lintGutter(),
            pixelArtLuaLinter,  // Use our custom linter
            autocompletion({
              override: [pixelArtLocalVariablesCompletion, pixelArtGlobalsCompletion, pixelArtStdLibCompletion]
            }),
            runKeymap,
            keymap.of(completionKeymap),
            ...createEditorTheme(settings.theme.name),
          ]}
          onChange={onEditorChange}
          className="drop-codemirror-instance"
        />
      </div>

      {errors.length > 0 && (
        <div className="drop-editor-errors">
          {errors.map((error, index) => (
            <div key={index} className="drop-editor-error">
              {error.line && <span className="drop-error-line">Line {error.line}:</span>}
              <span className="drop-error-message">{error.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="drop-editor-footer">
        <div className="drop-editor-info">
          <span>Ctrl+Enter to execute • Ctrl+Space for completion</span>
          <div className="drop-controls-row">
            <div className="drop-frame-count-control">
              <label htmlFor="frame-count-input">Frames:</label>
              <input
                id="frame-count-input"
                type="number"
                value={frameCount}
                onChange={(e) => onFrameCountChange(parseInt(e.target.value, 10))}
                min="1"
                max="1024"
                step="1"
              />
            </div>
            <div className="drop-canvas-size-control">
              <label htmlFor="canvas-width-input">Width:</label>
              <input
                id="canvas-width-input"
                type="number"
                value={canvasWidth}
                onChange={(e) => onCanvasWidthChange(parseInt(e.target.value, 10))}
                min="8"
                max="512"
                step="1"
              />
              <label htmlFor="canvas-height-input">Height:</label>
              <input
                id="canvas-height-input"
                type="number"
                value={canvasHeight}
                onChange={(e) => onCanvasHeightChange(parseInt(e.target.value, 10))}
                min="8"
                max="512"
                step="1"
              />
            </div>
          </div>
          {lastExecutionTime && (
            <span>Last execution: {lastExecutionTime.toFixed(1)}ms</span>
          )}
        </div>
        <div className="drop-editor-buttons">
          {onExecute && (
            <button
              className="drop-execute-button btn-primary"
              onClick={handleExecute}
              disabled={isExecuting}
              title="Execute Script (Ctrl+Enter)"
            >
              {isExecuting ? 'RUNNING...' : 'RUN'}
            </button>
          )}
          {onClear && (
            <button
              className="drop-clear-button btn-secondary"
              onClick={onClear}
              disabled={isExecuting}
              title="Clear Canvas"
            >
              CLEAR
            </button>
          )}
          {onExport && (
            <button
              className="drop-export-button btn-secondary"
              onClick={onExport}
              disabled={!canExport}
              title="Export Canvas"
            >
              EXPORT
            </button>
          )}
        </div>
      </div>
    </div>
  );
};