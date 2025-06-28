import React, { useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { keymap } from '@codemirror/view';
import { amberEditorTheme } from './editorTheme';
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

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onExecute,
  errors = [],
  className = '',
  frameCount,
  onFrameCountChange,
}) => {
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

  const runKeymap = [{
    key: 'Ctrl-Enter',
    mac: 'Cmd-Enter',
    run: () => { handleExecute(); return true; },
  }];

  return (
    <div className={`dro-code-editor ${className}`}>
      <div className="dro-editor-container">
        <CodeMirror
          value={value}
          height="100%"
          extensions={[
            StreamLanguage.define(lua),
            keymap.of(runKeymap),
            ...amberEditorTheme,
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
          <span>Ctrl+Enter to execute</span>
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
            className="dro-execute-button"
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