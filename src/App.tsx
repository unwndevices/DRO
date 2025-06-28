import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { MainContent, SplitLayout, Panel } from './components/Layout/MainContent';
import { CodeEditor } from './components/Editor/CodeEditor';
import { TemplateSelector } from './components/Editor/TemplateSelector';
import { SimpleSpectrumChart } from './components/Visualizer/SimpleSpectrumChart';
import { luaService } from './services/LuaEngine/LuaService';
import type { SpectralFrame, Datum } from './services/DataModel/types.ts';
import './styles/globals.css';

function App() {
  const [scriptContent, setScriptContent] = useState('');
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initialize with default template
  useEffect(() => {
    const defaultScript = luaService.getDefaultTemplate();
    setScriptContent(defaultScript);
  }, []);

  // Real Lua execution with shader-like processing
  const executeLuaScript = useCallback(async (code: string) => {
    setIsExecuting(true);
    setErrors([]);

    try {
      const result = await luaService.executeScript(code);
      
      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        
        console.log(`DRO: Lua execution successful in ${result.executionTime.toFixed(2)}ms`);
      } else if (result.errors) {
        setErrors(result.errors);
        console.error('DRO: Lua execution failed:', result.errors);
      }
      
    } catch (error) {
      setErrors([{
        message: error instanceof Error ? error.message : 'Unknown execution error',
        line: 1,
        type: 'runtime'
      }]);
      console.error('DRO: Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const handleSave = useCallback(() => {
    // Mock save functionality
    const scriptData = {
      content: scriptContent,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('dro-script', JSON.stringify(scriptData));
    console.log('DRO: Script saved to localStorage');
  }, [scriptContent]);

  const handleLoad = useCallback(() => {
    // Mock load functionality
    try {
      const saved = localStorage.getItem('dro-script');
      if (saved) {
        const scriptData = JSON.parse(saved);
        setScriptContent(scriptData.content || '');
        console.log('DRO: Script loaded from localStorage');
      }
    } catch (error) {
      console.error('DRO: Error loading script:', error);
    }
  }, []);

  const handleSettings = useCallback(() => {
    // Placeholder for settings modal
    console.log('DRO: Settings not implemented yet');
  }, []);

  return (
    <div className="dro-app">
      <Header 
        onSave={handleSave}
        onLoad={handleLoad}
        onSettings={handleSettings}
      />
      
      <MainContent>
        <SplitLayout
          left={
            <Panel title="Lua Editor" className="editor">
              <TemplateSelector
                onTemplateSelect={setScriptContent}
              />
              <CodeEditor
                value={scriptContent}
                onChange={setScriptContent}
                onExecute={executeLuaScript}
                errors={errors}
                className={isExecuting ? 'executing' : ''}
              />
            </Panel>
          }
          right={
            <Panel title="Spectrum Visualization" className="visualizer">
              <SimpleSpectrumChart
                frames={spectralData?.frames || []}
                currentFrame={currentFrame}
                onFrameChange={setCurrentFrame}
                className={`${spectralData ? '' : 'empty'} ${isExecuting ? 'loading' : ''}`}
              />
            </Panel>
          }
        />
      </MainContent>
      
      <div className="dro-status-bar">
        <div className="dro-status-left">
          <div className="dro-status-item">
            <span>DRO v0.2.0 - Lua Engine</span>
          </div>
          {spectralData && (
            <div className="dro-status-item success">
              <span>Generated: {spectralData.frameCount}f × {spectralData.bandCount}b</span>
            </div>
          )}
          {errors.length > 0 && (
            <div className="dro-status-item error">
              <span>Lua Error{errors.length > 1 ? 's' : ''}: {errors.length}</span>
            </div>
          )}
          {isExecuting && (
            <div className="dro-status-item executing">
              <span>Executing Lua...</span>
            </div>
          )}
        </div>
        <div className="dro-status-right">
          <div className="dro-status-item">
            <span>{isExecuting ? 'Running' : spectralData ? 'Complete' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
