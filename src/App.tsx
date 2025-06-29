import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { MainContent, SplitLayout, Panel } from './components/Layout/MainContent';
import { CodeEditor } from './components/Editor/CodeEditor';
import { SimpleSpectrumChart } from './components/Visualizer/SimpleSpectrumChart';
import { SettingsModal } from './components/UI/SettingsModal';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import type { Settings } from './types/settings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { luaService } from './services/LuaEngine/LuaService';
import type { Datum } from './services/DataModel/types.ts';
import './styles/globals.css';

interface Template {
  name: string;
  description: string;
  getCode: () => string;
}

const templates: Template[] = [
  {
    name: 'Default Spectral',
    description: 'Frequency-based sine wave with bass boost',
    getCode: () => luaService.getDefaultTemplate()
  },
  {
    name: 'Simple Test',
    description: 'Basic test: band index pattern',
    getCode: () => luaService.getSimpleTestTemplate()
  },
  {
    name: 'Diagonal Test',
    description: 'Band i lights up at frame i',
    getCode: () => luaService.getDiagonalTestTemplate()
  },
  {
    name: 'Simple Sine Wave',
    description: 'Basic sine wave across all bands',
    getCode: () => luaService.getSineWaveTemplate()
  },
  {
    name: 'Frequency Response',
    description: 'Low-pass filter response curve',
    getCode: () => luaService.getFrequencyResponseTemplate()
  }
];

// AppContent component that uses settings context
const AppContent: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [scriptContent, setScriptContent] = useState('');
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameCount, setFrameCount] = useState(128);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const executeLuaScript = useCallback(async (code: string) => {
    setIsExecuting(true);
    setErrors([]);

    try {
      const result = await luaService.executeScript(code, frameCount);
      
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
      }]);
      console.error('DRO: Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [frameCount]);

  // Initialize with default template and execute it
  useEffect(() => {
    const defaultScript = templates[0].getCode();
    setScriptContent(defaultScript);
    executeLuaScript(defaultScript);
  }, [executeLuaScript]);

  const handleTemplateSelect = useCallback((code: string) => {
    setScriptContent(code);
    executeLuaScript(code);
  }, [executeLuaScript]);

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
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleToggleBiggerEditor = useCallback(() => {
    updateSettings({
      layout: {
        ...settings.layout,
        biggerEditor: !settings.layout.biggerEditor
      }
    });
  }, [settings.layout, updateSettings]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onToggleBiggerEditor: handleToggleBiggerEditor,
    onEscape: () => {
      if (isSettingsOpen) {
        handleCloseSettings();
      }
    },
    onSave: handleSave,
    onLoad: handleLoad,
    onExecute: () => executeLuaScript(scriptContent),
  });

  return (
    <div className="dro-app">
      <Header 
        onSave={handleSave}
        onLoad={handleLoad}
        onSettings={handleSettings}
        templates={templates}
        onTemplateSelect={handleTemplateSelect}
      />
      
      <MainContent>
        <SplitLayout
          left={
            <Panel title="Script Editor" className="editor">
              <CodeEditor
                value={scriptContent}
                onChange={setScriptContent}
                onExecute={executeLuaScript}
                errors={errors}
                className={isExecuting ? 'executing' : ''}
                frameCount={frameCount}
                onFrameCountChange={setFrameCount}
              />
            </Panel>
          }
          right={
            <Panel title="Datum Preview" className="visualizer">
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

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
};

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
