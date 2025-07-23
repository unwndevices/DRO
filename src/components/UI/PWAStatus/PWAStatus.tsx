import React, { useState, useEffect } from 'react';
import { pwaService, type PWAStatus as PWAStatusType } from '../../../services/PWAService';
import './PWAStatus.css';

export const PWAStatus: React.FC = () => {
  const [status, setStatus] = useState<PWAStatusType>(pwaService.getStatus());
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Subscribe to PWA status changes
    const unsubscribe = pwaService.onStatusChange(setStatus);
    
    // Keyboard shortcut to toggle debug panel (Ctrl+Shift+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    // Show install prompt if available
    if (status.canInstall && !status.isInstalled) {
      setShowInstallPrompt(true);
    }
  }, [status.canInstall, status.isInstalled]);

  useEffect(() => {
    // Show update prompt if available and not currently updating
    if (status.updateAvailable && !isUpdating) {
      setShowUpdatePrompt(true);
    } else if (!status.updateAvailable) {
      setShowUpdatePrompt(false);
      setIsUpdating(false);
    }
  }, [status.updateAvailable, isUpdating]);

  const handleInstall = async () => {
    const result = await pwaService.showInstallPrompt();
    if (result) {
      setShowInstallPrompt(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      setShowUpdatePrompt(false);
      console.log('DRO PWA: Starting update process');
      
      await pwaService.updateServiceWorker();
      
      // The service worker will handle the reload via controllerchange event
      // If it doesn't happen within 3 seconds, force reload
      setTimeout(() => {
        console.log('DRO PWA: Forcing reload as fallback');
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('DRO PWA: Failed to update service worker:', error);
      setIsUpdating(false);
      setShowUpdatePrompt(false);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
  };

  const dismissUpdatePrompt = () => {
    setShowUpdatePrompt(false);
    // Don't show again for this session
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 30000); // Re-enable after 30 seconds
  };

  return (
    <div className="pwa-status">
      {/* Offline Indicator */}
      {!status.isOnline && (
        <div className="pwa-offline-indicator">
          <div className="pwa-offline-content">
            <span className="pwa-offline-icon">📡</span>
            <span className="pwa-offline-text">Offline Mode</span>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && status.canInstall && (
        <div className="pwa-install-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-header">
              <span className="pwa-prompt-icon">📱</span>
              <span className="pwa-prompt-title">Install DRO</span>
            </div>
            <div className="pwa-prompt-description">
              Install DRO as an app for faster access and offline use
            </div>
            <div className="pwa-prompt-actions">
              <button 
                className="pwa-prompt-button pwa-prompt-install btn-primary"
                onClick={handleInstall}
              >
                Install
              </button>
              <button 
                className="pwa-prompt-button pwa-prompt-dismiss btn-secondary"
                onClick={dismissInstallPrompt}
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && status.updateAvailable && (
        <div className="pwa-update-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-header">
              <span className="pwa-prompt-icon">🔄</span>
              <span className="pwa-prompt-title">Update Available</span>
            </div>
            <div className="pwa-prompt-description">
              A new version of DRO is available. Update now for the latest features.
            </div>
            <div className="pwa-prompt-actions">
              <button 
                className="pwa-prompt-button pwa-prompt-update btn-primary"
                onClick={handleUpdate}
              >
                Update Now
              </button>
              <button 
                className="pwa-prompt-button pwa-prompt-dismiss btn-secondary"
                onClick={dismissUpdatePrompt}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Status Indicator (for debugging) */}
      {import.meta.env.DEV && showDebugPanel && (
        <div className="pwa-debug-status">
          <div className="pwa-debug-item">
            <span className="pwa-debug-label">Installed:</span>
            <span className={`pwa-debug-value ${status.isInstalled ? 'active' : 'inactive'}`}>
              {status.isInstalled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="pwa-debug-item">
            <span className="pwa-debug-label">Can Install:</span>
            <span className={`pwa-debug-value ${status.canInstall ? 'active' : 'inactive'}`}>
              {status.canInstall ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="pwa-debug-item">
            <span className="pwa-debug-label">Online:</span>
            <span className={`pwa-debug-value ${status.isOnline ? 'active' : 'inactive'}`}>
              {status.isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="pwa-debug-item">
            <span className="pwa-debug-label">Update:</span>
            <span className={`pwa-debug-value ${status.updateAvailable ? 'active' : 'inactive'}`}>
              {status.updateAvailable ? 'Available' : 'None'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 