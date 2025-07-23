import React, { useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { autocompletion, completionKeymap, CompletionContext } from '@codemirror/autocomplete';
import { foldGutter, codeFolding } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import type { Text } from '@codemirror/state';
import { createEditorTheme } from './editorTheme';
import { useSettings } from '../../contexts/SettingsContext';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: (code: string) => void;
  errors?: Array<{
    message: string;
    line?: number;
  }>;
  className?: string;
  frameCount: number;
  onFrameCountChange: (count: number) => void;
}

// Lua syntax and semantic linter
const luaLinter = linter((view) => {
  const doc = view.state.doc;
  const text = doc.toString();
  const diagnostics: Diagnostic[] = [];

  // Check for basic syntax errors
  checkSyntaxErrors(text, diagnostics, doc);
  
  // Check for undefined variables
  checkUndefinedVariables(text, diagnostics, doc);
  
  // Check for common Lua mistakes
  checkCommonMistakes(text, diagnostics, doc);

  return diagnostics;
});

// Basic Lua syntax error detection
const checkSyntaxErrors = (text: string, diagnostics: Diagnostic[], doc: Text) => {
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Check for unmatched brackets
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = line[i - 1];
      
      // Handle string literals
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      if (!inString) {
        if (char in brackets) {
          stack.push(brackets[char as keyof typeof brackets]);
        } else if (Object.values(brackets).includes(char)) {
          const expected = stack.pop();
          if (expected !== char) {
            const from = doc.line(lineIndex + 1).from + i;
            diagnostics.push({
              from,
              to: from + 1,
              severity: 'error',
              message: `Unmatched '${char}'. Expected '${expected || 'nothing'}'`
            });
          }
        }
      }
    }
    
    // Check for incomplete function definitions
    if (trimmedLine.startsWith('function') && !trimmedLine.includes('end') && !text.slice(text.indexOf(line)).includes('end')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'Function definition missing "end" keyword'
      });
    }
    
    // Check for incomplete if statements
    if (trimmedLine.match(/^if\s+.*\s+then\s*$/) && !text.slice(text.indexOf(line)).includes('end')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'If statement missing "end" keyword'
      });
    }
    
    // Check for incomplete for loops
    if (trimmedLine.match(/^for\s+.*\s+do\s*$/) && !text.slice(text.indexOf(line)).includes('end')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'For loop missing "end" keyword'
      });
    }
  });
};

// Check for undefined variables
const checkUndefinedVariables = (text: string, diagnostics: Diagnostic[], doc: Text) => {
  // Extract all local variables and function parameters
  const localVars = new Set<string>();
  const globalVars = new Set(['i', 'f', 'i_amt', 'f_amt', 'math', 'print', 'type', 'tonumber', 'tostring', 'pairs', 'ipairs', 'next', 'string', 'table']);
  
  // Standard Lua globals
  globalVars.add('_G');
  globalVars.add('_VERSION');
  globalVars.add('assert');
  globalVars.add('collectgarbage');
  globalVars.add('error');
  globalVars.add('getmetatable');
  globalVars.add('setmetatable');
  globalVars.add('rawget');
  globalVars.add('rawset');
  globalVars.add('select');
  globalVars.add('unpack');
  globalVars.add('pcall');
  globalVars.add('xpcall');
  
  // Extract local variable declarations
  const localVarRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  let match;
  while ((match = localVarRegex.exec(text)) !== null) {
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }
  
  // Extract function names and parameters
  const functionParamRegex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
  while ((match = functionParamRegex.exec(text)) !== null) {
    // Add function name to local variables
    if (match[1] && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[1])) {
      localVars.add(match[1]);
    }
    // Add function parameters
    if (match[2] && match[2].trim()) {
      const params = match[2].split(',').map(p => p.trim());
      params.forEach(param => {
        if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          localVars.add(param);
        }
      });
    }
  }
  
  // Extract local function declarations: local function name()
  const localFunctionRegex = /local\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  while ((match = localFunctionRegex.exec(text)) !== null) {
    if (match[1] && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[1])) {
      localVars.add(match[1]);
    }
  }
  
  // Extract for loop variables
  const forLoopRegex = /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g;
  while ((match = forLoopRegex.exec(text)) !== null) {
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }
  
  // Check for undefined variable usage
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    // Skip comments and strings
    const cleanLine = line.replace(/--.*$/, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
    
    let varMatch;
    const usageRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    while ((varMatch = usageRegex.exec(cleanLine)) !== null) {
      const varName = varMatch[1];
      
      // Skip keywords and known patterns
      const keywords = ['function', 'local', 'if', 'then', 'else', 'elseif', 'end', 'for', 'while', 'do', 'return', 'break', 'true', 'false', 'nil', 'and', 'or', 'not', 'in'];
      if (keywords.includes(varName)) continue;
      
      // Skip if it's a property access (after a dot)
      const beforeVar = cleanLine.substring(0, varMatch.index);
      if (beforeVar.endsWith('.')) continue;
      
      // Skip if it's a function declaration
      if (cleanLine.includes(`function ${varName}`) || cleanLine.includes(`function(`) || cleanLine.includes(`local ${varName}`)) continue;
      
      // Check if variable is defined
      if (!localVars.has(varName) && !globalVars.has(varName)) {
        const lineStart = doc.line(lineIndex + 1).from;
        const from = lineStart + varMatch.index!;
        const to = from + varName.length;
        
        diagnostics.push({
          from,
          to,
          severity: 'warning',
          message: `Undefined variable '${varName}'. Did you mean to declare it with 'local ${varName}'?`
        });
      }
    }
  });
};

// Check for common Lua mistakes
const checkCommonMistakes = (text: string, diagnostics: Diagnostic[], doc: Text) => {
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Check for assignment instead of comparison (but not <=, >=, ~=, ==)
    if (trimmedLine.match(/if\s+.*[^<>=~]=(?!=)/)) {
      const assignIndex = line.indexOf('=');
      const from = doc.line(lineIndex + 1).from + assignIndex;
      diagnostics.push({
        from,
        to: from + 1,
        severity: 'warning',
        message: 'Did you mean "==" for comparison instead of "=" for assignment?'
      });
    }
    
    // Check for missing "then" in if statements
    if (trimmedLine.match(/^if\s+.*[^then]\s*$/) && !trimmedLine.includes('then')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'If statement missing "then" keyword'
      });
    }
    
    // Check for missing "do" in loops
    if ((trimmedLine.match(/^for\s+/) || trimmedLine.match(/^while\s+/)) && !trimmedLine.includes('do')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'Loop missing "do" keyword'
      });
    }
    
    // Check for incorrect string concatenation
    if (trimmedLine.includes('+') && (trimmedLine.includes('"') || trimmedLine.includes("'"))) {
      const plusIndex = line.indexOf('+');
      const from = doc.line(lineIndex + 1).from + plusIndex;
      diagnostics.push({
        from,
        to: from + 1,
        severity: 'info',
        message: 'Use ".." for string concatenation instead of "+"'
      });
    }
  });
};

// Lua spectral processing globals completion
const luaGlobalsCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;
  
  const options = [
    {
      label: 'i',
      type: 'variable',
      info: 'Current band index (0 to i_amt-1)',
      detail: 'number'
    },
    {
      label: 'f', 
      type: 'variable',
      info: 'Current frame number (0 to f_amt-1)',
      detail: 'number'
    },
    {
      label: 'i_amt',
      type: 'variable', 
      info: 'Total number of frequency bands (20)',
      detail: 'number'
    },
    {
      label: 'f_amt',
      type: 'variable',
      info: 'Total number of frames (user configurable)',
      detail: 'number'
    }
  ];

  return {
    from: word.from,
    options
  };
};

// Dynamic local variables completion
const luaLocalVariablesCompletion = (context: CompletionContext) => {
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

// Lua standard library completion
const luaStdLibCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/[\w.]*$/);
  if (!word) return null;
  
  const options = [
    // Math functions
    { label: 'math.sin', type: 'function', info: 'Returns the sine of x (in radians)', detail: 'math.sin(x)' },
    { label: 'math.cos', type: 'function', info: 'Returns the cosine of x (in radians)', detail: 'math.cos(x)' },
    { label: 'math.tan', type: 'function', info: 'Returns the tangent of x (in radians)', detail: 'math.tan(x)' },
    { label: 'math.pi', type: 'constant', info: 'The value of π (pi)', detail: 'number' },
    { label: '^', type: 'operator', info: 'Exponentiation operator: base^exponent', detail: '(base)^(exponent)' },
    { label: 'math.exp', type: 'function', info: 'Returns e^x', detail: 'math.exp(x)' },
    { label: 'math.log', type: 'function', info: 'Returns the natural logarithm of x', detail: 'math.log(x)' },
    { label: 'math.sqrt', type: 'function', info: 'Returns the square root of x', detail: 'math.sqrt(x)' },
    { label: 'math.abs', type: 'function', info: 'Returns the absolute value of x', detail: 'math.abs(x)' },
    { label: 'math.floor', type: 'function', info: 'Returns the largest integer smaller than or equal to x', detail: 'math.floor(x)' },
    { label: 'math.ceil', type: 'function', info: 'Returns the smallest integer larger than or equal to x', detail: 'math.ceil(x)' },
    { label: 'math.max', type: 'function', info: 'Returns the maximum value among its arguments', detail: 'math.max(x, ...)' },
    { label: 'math.min', type: 'function', info: 'Returns the minimum value among its arguments', detail: 'math.min(x, ...)' },
    { label: 'math.random', type: 'function', info: 'Returns a pseudo-random number', detail: 'math.random([m [, n]])' },
    
    // Common Lua functions
    { label: 'print', type: 'function', info: 'Prints values to output', detail: 'print(...)' },
    { label: 'type', type: 'function', info: 'Returns the type of its argument', detail: 'type(v)' },
    { label: 'tonumber', type: 'function', info: 'Converts argument to a number', detail: 'tonumber(e [,base])' },
    { label: 'tostring', type: 'function', info: 'Converts argument to a string', detail: 'tostring(v)' },
    
    // Control structures and keywords
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

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onExecute,
  errors = [],
  className = '',
  frameCount,
  onFrameCountChange,
}) => {
  const { settings } = useSettings();
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);

  const handleExecute = useCallback(() => {
    console.log('DRO: CodeEditor handleExecute called');
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
      console.log('DRO: CodeEditor Ctrl+Enter keymap triggered');
      handleExecute(); 
      return true; // Important: return true to prevent further processing
    },
  }]));

  return (
    <div className={`dro-code-editor ${className}`}>
      <div className="dro-editor-container">
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
            luaLinter,
            autocompletion({
              override: [luaLocalVariablesCompletion, luaGlobalsCompletion, luaStdLibCompletion]
            }),
            runKeymap,
            keymap.of(completionKeymap),
            ...createEditorTheme(settings.theme.name),
          ]}
          onChange={onEditorChange}
          className="dro-codemirror-instance"
        />
      </div>
      
      {errors.length > 0 && (
        <div className="dro-editor-errors">
          {errors.map((error, index) => (
            <div key={index} className="dro-editor-error">
              {error.line && <span className="dro-error-line">Line {error.line}:</span>}
              <span className="dro-error-message">{error.message}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="dro-editor-footer">
        <div className="dro-editor-info">
          <span>Ctrl+Enter to execute • Ctrl+Space for completion</span>
          <div className="dro-frame-count-control">
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
          {lastExecutionTime && (
            <span>Last execution: {lastExecutionTime.toFixed(1)}ms</span>
          )}
        </div>
        {onExecute && (
          <button 
            className="dro-execute-button btn-primary"
            onClick={handleExecute}
            title="Execute Script (Ctrl+Enter)"
          >
            RUN
          </button>
        )}
      </div>
    </div>
  );
}; 