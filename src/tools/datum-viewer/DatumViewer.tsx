import React, { useState, useCallback } from 'react';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import type { Datum } from '../../services/DataModel/types';

export const DatumViewer: React.FC = () => {
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleImportDatum = useCallback(async () => {
    if (isImporting) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await DatumFileService.importDatum();

      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        console.log('DRO: Datum imported successfully:', result.datum.name);
      } else if (result.error) {
        setImportError(result.error);
        console.error('DRO: Import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setImportError(errorMessage);
      console.error('DRO: Import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting]);

  const handleImportFromJson = useCallback(async () => {
    if (isImporting) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await DatumFileService.importDatumFromJson();

      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        console.log('DRO: JSON datum imported successfully:', result.datum.name);
      } else if (result.error) {
        setImportError(result.error);
        console.error('DRO: JSON import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setImportError(errorMessage);
      console.error('DRO: JSON import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (isImporting) return;

    const files = Array.from(e.dataTransfer.files);
    const datumFile = files.find(file =>
      file.name.toLowerCase().endsWith('.datum') ||
      file.name.toLowerCase().endsWith('.dat') ||
      file.name.toLowerCase().endsWith('.json')
    );

    if (!datumFile) {
      setImportError('Please drop a .datum, .dat, or .json file');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      let result;
      if (datumFile.name.toLowerCase().endsWith('.json')) {
        const text = await datumFile.text();
        const datum = JSON.parse(text) as Datum;
        result = { success: true, datum };
      } else {
        result = await DatumFileService.importDatumFromFile(datumFile);
      }

      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        console.log('DRO: Datum dropped and imported successfully:', result.datum.name);
      } else if (result.error) {
        setImportError(result.error);
        console.error('DRO: Drop import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setImportError(errorMessage);
      console.error('DRO: Drop import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting]);

  const handleClearData = useCallback(() => {
    setSpectralData(null);
    setCurrentFrame(0);
    setImportError(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <div className="datum-viewer-tool">
      <div className="datum-viewer-header">
        <div className="tool-actions">
          <button
            onClick={handleImportDatum}
            className="tool-button primary btn-primary"
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Datum'}
          </button>
          <button
            onClick={handleImportFromJson}
            className="tool-button btn-secondary"
            disabled={isImporting}
          >
            Import JSON
          </button>
          {spectralData && (
            <button
              onClick={handleClearData}
              className="tool-button secondary btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <MainContent>
        <SplitLayout
          left={
            <Panel title="File Information" className="file-info">
              {!spectralData ? (
                <div
                  className={`drop-zone ${dragActive ? 'active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="drop-zone-content">
                    <div className="drop-zone-icon">📁</div>
                    <h3>Drop datum files here</h3>
                    <p>or use the Import buttons above</p>
                    <div className="supported-formats">
                      <small>Supported: .datum, .dat, .json</small>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="datum-info">
                  <div className="info-section">
                    <h3>Datum Properties</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Name:</label>
                        <span>{spectralData.name || 'Unnamed'}</span>
                      </div>
                      <div className="info-item">
                        <label>Frames:</label>
                        <span>{spectralData.frameCount.toLocaleString()}</span>
                      </div>
                      <div className="info-item">
                        <label>Bands:</label>
                        <span>{spectralData.bandCount}</span>
                      </div>
                    </div>
                  </div>

                  {spectralData.description && (
                    <div className="info-section">
                      <h3>Description</h3>
                      <p>{spectralData.description}</p>
                    </div>
                  )}

                  <div className="info-section">
                    <h3>Timestamps</h3>
                    <div className="info-grid">
                      {spectralData.createdAt && (
                        <div className="info-item">
                          <label>Created:</label>
                          <span>{new Date(spectralData.createdAt).toLocaleString()}</span>
                        </div>
                      )}
                      {spectralData.modifiedAt && (
                        <div className="info-item">
                          <label>Modified:</label>
                          <span>{new Date(spectralData.modifiedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="info-section">
                    <h3>Statistics</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Data Points:</label>
                        <span>{(spectralData.frameCount * spectralData.bandCount).toLocaleString()}</span>
                      </div>
                      <div className="info-item">
                        <label>Memory Size:</label>
                        <span>{formatFileSize(spectralData.frameCount * spectralData.bandCount * 4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {importError && (
                <div className="import-error">
                  <h4>Import Error</h4>
                  <p>{importError}</p>
                </div>
              )}
            </Panel>
          }
          right={
            <Panel title="Spectral Preview" className="visualizer">
              <SimpleSpectrumChart
                frames={spectralData?.frames || []}
                currentFrame={currentFrame}
                onFrameChange={setCurrentFrame}
                className={`${spectralData ? '' : 'empty'} ${isImporting ? 'loading' : ''}`}
              />
            </Panel>
          }
        />
      </MainContent>

      <div className="tool-status">
        <div className="status-left">
          <div className="status-item">
            <span>Datum Viewer</span>
          </div>
          {spectralData && (
            <div className="status-item success">
              <span>Loaded: {spectralData.name || 'Unnamed'} ({spectralData.frameCount}f × {spectralData.bandCount}b)</span>
            </div>
          )}
          {importError && (
            <div className="status-item error">
              <span>Error: {importError}</span>
            </div>
          )}
          {isImporting && (
            <div className="status-item executing">
              <span>Importing datum...</span>
            </div>
          )}
        </div>
        <div className="status-right">
          <div className="status-item">
            <span>{isImporting ? 'Loading' : spectralData ? 'Loaded' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};