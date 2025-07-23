import React, { useState, useEffect, useCallback } from 'react';
import './FirmwareSelector.css';

interface SimpleRelease {
  version: string;
  releaseDate: string;
  changelog: string[];
  platforms: {
    daisy: string;
    esp32: string;
  };
}

interface ReleaseIndex {
  latest: string;
  releases: SimpleRelease[];
}

interface FirmwareSelectorProps {
  platform: 'daisy' | 'esp32';
  onFirmwareLoad: (binary: Blob, version: string) => void;
  disabled?: boolean;
}

export const FirmwareSelector: React.FC<FirmwareSelectorProps> = ({ 
  platform, 
  onFirmwareLoad, 
  disabled = false 
}) => {
  const [versions, setVersions] = useState<SimpleRelease[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = useCallback(async () => {
    try {
      setFetchError('');
      // Fetch from unwn_fw repository
      const response = await fetch('https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`);
      }
      
      const data: ReleaseIndex = await response.json();
      
      setVersions(data.releases);
      setSelectedVersion(data.latest);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch firmware versions');
    }
  }, []);

  const downloadFirmware = useCallback(async (version: string) => {
    const release = versions.find(v => v.version === version);
    if (!release) {
      console.error('Release not found:', version);
      return;
    }

    setLoading(true);
    try {
      const url = release.platforms[platform];
      console.log(`Downloading firmware from: ${url}`);
      
      // Try direct fetch first
      let response = await fetch(url, {
        mode: 'cors',
        cache: 'no-cache'
      }).catch(async (e) => {
        console.warn('Direct fetch failed, trying with cache:', e);
        // Try with default cache if CORS fails
        return fetch(url);
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const binary = await response.blob();
      console.log(`Downloaded firmware: ${binary.size} bytes`);
      
      onFirmwareLoad(binary, version);
    } catch (error) {
      console.error('Failed to download firmware:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to download firmware');
    } finally {
      setLoading(false);
    }
  }, [versions, platform, onFirmwareLoad]);

  const selectedRelease = versions.find(v => v.version === selectedVersion);

  if (fetchError && versions.length === 0) {
    return (
      <div className="firmware-selector error">
        <h3>Firmware Version</h3>
        <div className="error-message">
          <p>Unable to fetch firmware versions: {fetchError}</p>
          <button onClick={fetchVersions} className="retry-button btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="firmware-selector">
      <h3>Firmware Version</h3>
      
      <div className="version-controls">
        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="version-select"
          disabled={disabled || loading || versions.length === 0}
        >
          <option value="">Select version...</option>
          {versions.map(version => (
            <option key={version.version} value={version.version}>
              {version.version} - {version.releaseDate}
            </option>
          ))}
        </select>
        
        {selectedRelease && (
          <button
            onClick={() => setShowChangelog(!showChangelog)}
            className="changelog-button btn-secondary"
            disabled={disabled}
          >
            {showChangelog ? 'Hide' : 'Show'} Changes
          </button>
        )}
      </div>

      {selectedRelease && showChangelog && (
        <div className="changelog">
          <h4>Changes in {selectedRelease.version}</h4>
          <ul>
            {selectedRelease.changelog.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => downloadFirmware(selectedVersion)}
        className="download-button btn-primary"
        disabled={!selectedVersion || loading || disabled}
      >
        {loading ? 'Downloading...' : 'Load Firmware'}
      </button>

      {fetchError && (
        <div className="error-message">
          <small>Warning: {fetchError}</small>
        </div>
      )}
    </div>
  );
};