import React, { useState, useCallback, useEffect } from 'react';
import { CodeEditor } from '../../components/Editor/CodeEditor';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { luaService } from '../../services/LuaEngine/LuaService';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import type { Datum } from '../../services/DataModel/types';

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
  },
  {
    name: 'Exponential Decay',
    description: 'Exponential decay pattern across bands and frames',
    getCode: () => luaService.getExponentialDecayTemplate()
  },
  {
    name: 'Random Walk',
    description: 'Deterministic random walk pattern',
    getCode: () => luaService.getRandomWalkTemplate()
  },
  {
    name: 'Pulsar',
    description: 'Moving peak that sweeps across frequency bands',
    getCode: () => luaService.getPulsarTemplate()
  }
];

export const SpectralAnalysis: React.FC = () => {
  const [scriptContent, setScriptContent] = useState('');
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameCount, setFrameCount] = useState(128);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleTemplateSelect = useCallback((templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      const code = template.getCode();
      setScriptContent(code);
      executeLuaScript(code);
    }
  }, [executeLuaScript]);

  const handleSave = useCallback(() => {
    const scriptData = {
      content: scriptContent,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('dro-script', JSON.stringify(scriptData));
    console.log('DRO: Script saved to localStorage');
  }, [scriptContent]);

  const handleLoad = useCallback(() => {
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

  const handleExportDatum = useCallback(async () => {
    if (isExporting || !spectralData) return;
    
    setIsExporting(true);
    setErrors([]);
    
    try {
      const result = await DatumFileService.exportDatum(spectralData);
      
      if (result.success) {
        console.log('DRO: Datum exported successfully:', result.filename);
      } else if (result.error) {
        setErrors([{
          message: `Export failed: ${result.error}`,
          line: 1
        }]);
        console.error('DRO: Export failed:', result.error);
      }
    } catch (error) {
      setErrors([{
        message: `Export error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        line: 1
      }]);
      console.error('DRO: Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, spectralData]);

  return (
    <div className="spectral-analysis-tool">
      <div className="spectral-tool-header">
        <div className="template-selector">
          <label>Templates:</label>
          <select 
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="template-dropdown"
          >
            {templates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="tool-actions">
          <button onClick={handleSave} className="tool-button btn-secondary">
            Save Script
          </button>
          <button onClick={handleLoad} className="tool-button btn-secondary">
            Load Script
          </button>
          <div className="tool-actions-separator"></div>
          <button 
            onClick={handleExportDatum} 
            className="tool-button btn-primary"
            disabled={isExporting || !spectralData}
          >
            {isExporting ? 'Exporting...' : 'Download Datum'}
          </button>
        </div>
      </div>

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
      
      <div className="tool-status">
        <div className="status-left">
          <div className="status-item">
            <span>Lua Engine</span>
          </div>
          {spectralData && (
            <div className="status-item success">
              <span>Generated: {spectralData.frameCount}f × {spectralData.bandCount}b</span>
            </div>
          )}
          {errors.length > 0 && (
            <div className="status-item error">
              <span>Lua Error{errors.length > 1 ? 's' : ''}: {errors.length}</span>
            </div>
          )}
          {isExecuting && (
            <div className="status-item executing">
              <span>Executing Lua...</span>
            </div>
          )}
          {isExporting && (
            <div className="status-item executing">
              <span>Exporting datum...</span>
            </div>
          )}
        </div>
        <div className="status-right">
          <div className="status-item">
            <span>{isExecuting ? 'Running' : spectralData ? 'Complete' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};