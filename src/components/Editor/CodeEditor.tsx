import React, { useState, useCallback } from 'react';
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
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onExecute,
  errors = [],
  className = ''
}) => {
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (onExecute) {
        const startTime = performance.now();
        onExecute(value);
        setLastExecutionTime(performance.now() - startTime);
      }
    }
    
    // Tab support
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (event.shiftKey) {
        // Unindent (remove 2 spaces at start of line)
        const lines = value.split('\n');
        const startLine = value.substring(0, start).split('\n').length - 1;
        const endLine = value.substring(0, end).split('\n').length - 1;
        
        for (let i = startLine; i <= endLine; i++) {
          if (lines[i].startsWith('  ')) {
            lines[i] = lines[i].substring(2);
          }
        }
        
        onChange(lines.join('\n'));
      } else {
        // Indent (add 2 spaces)
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        
        // Restore cursor position
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        }, 0);
      }
    }
  }, [value, onChange, onExecute]);

  const defaultScript = `-- DRO Lua Script
-- Create a 20-band spectral datum
local datum = DRO.createDatum(128, 20)

-- Generate spectral data
for frame = 1, 128 do
  for band = 1, 20 do
    -- Example: sine wave pattern
    local frequency = band * 0.5
    local amplitude = math.sin(frame * frequency * 0.1)
    datum:getFrame(frame):setBand(band, amplitude)
  end
end

-- Update visualization
DRO.updateVisualization(datum)
DRO.log("Generated 128 frames with 20 bands each")`;

  const displayValue = value || defaultScript;

  return (
    <div className={`dro-code-editor ${className}`}>
      <div className="dro-editor-container">
        <textarea
          className="dro-editor-textarea"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="-- Enter Lua code here..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <div className="dro-editor-gutter">
          {displayValue.split('\n').map((_, index) => (
            <div key={index} className="dro-editor-line-number">
              {index + 1}
            </div>
          ))}
        </div>
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
          <span>Ctrl+Enter to execute</span>
          {lastExecutionTime && (
            <span>Last execution: {lastExecutionTime.toFixed(1)}ms</span>
          )}
        </div>
        {onExecute && (
          <button 
            className="dro-execute-button"
            onClick={() => onExecute(displayValue)}
            title="Execute Script (Ctrl+Enter)"
          >
            RUN
          </button>
        )}
      </div>
    </div>
  );
}; 