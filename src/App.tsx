import React, { useState, useCallback } from 'react';
import { Header } from './components/Layout/Header';
import { MainContent, SplitLayout, Panel } from './components/Layout/MainContent';
import { CodeEditor } from './components/Editor/CodeEditor';
import { SpectrumChart } from './components/Visualizer/SpectrumChart';
import type { SpectralFrame, Datum } from './services/DataModel/types.ts';
import './styles/globals.css';

function App() {
  const [scriptContent, setScriptContent] = useState('');
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Mock Lua execution - this will be replaced with Wasmoon integration
  const executeLuaScript = useCallback(async (code: string) => {
    setIsExecuting(true);
    setErrors([]);

    try {
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock data generation - this simulates what the Lua script would do
      const frames: SpectralFrame[] = [];
      const frameCount = 128;
      const bandCount = 20;

      for (let f = 0; f < frameCount; f++) {
        const bands: number[] = [];
        for (let b = 0; b < bandCount; b++) {
          // Generate sample spectral data
          const frequency = (b + 1) * 0.5;
          const time = f * 0.1;
          const amplitude = Math.sin(time * frequency) * Math.cos(time * 0.2);
          bands.push(amplitude);
        }
        
        frames.push({
          bands,
          timestamp: f,
          metadata: { frame: f }
        });
      }

      const datum: Datum = {
        frames,
        sampleRate: 44100,
        frameCount,
        bandCount,
        name: 'Generated Spectral Data',
        createdAt: new Date()
      };

      setSpectralData(datum);
      setCurrentFrame(0);
      
      console.log('DRO: Generated spectral data with', frameCount, 'frames and', bandCount, 'bands');
      
    } catch (error) {
      setErrors([{
        message: error instanceof Error ? error.message : 'Unknown execution error',
        line: 1
      }]);
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
              <SpectrumChart
                frames={spectralData?.frames || []}
                currentFrame={currentFrame}
                className={spectralData ? '' : 'empty'}
              />
            </Panel>
          }
        />
      </MainContent>
      
      <div className="dro-status-bar">
        <div className="dro-status-left">
          <div className="dro-status-item">
            <span>DRO v0.1.0</span>
          </div>
          {spectralData && (
            <div className="dro-status-item success">
              <span>{spectralData.frameCount} frames, {spectralData.bandCount} bands</span>
            </div>
          )}
          {errors.length > 0 && (
            <div className="dro-status-item error">
              <span>{errors.length} error{errors.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="dro-status-right">
          <div className="dro-status-item">
            <span>Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
