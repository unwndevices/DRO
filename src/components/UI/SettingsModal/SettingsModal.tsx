import React, { useEffect } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { LayoutSettings } from './LayoutSettings';
import { ThemeSettings } from './ThemeSettings';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { resetSettings } = useSettings();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleReset = () => {
    resetSettings();
    console.log('DRO: Settings reset to defaults');
  };

  return (
    <div className="settings-modal-backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal" role="dialog" aria-labelledby="settings-title" aria-modal="true">
        <div className="settings-modal-header">
          <h2 id="settings-title" className="settings-modal-title">
            DRO SETTINGS
          </h2>
          <button 
            className="settings-modal-close" 
            onClick={onClose}
            aria-label="Close settings"
            title="Close Settings (Esc)"
          >
            ×
          </button>
        </div>

        <div className="settings-modal-content">
          <div className="settings-section">
            <h3 className="settings-section-title">LAYOUT</h3>
            <LayoutSettings />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">THEME</h3>
            <ThemeSettings />
          </div>
        </div>

        <div className="settings-modal-footer">
          <button 
            className="settings-button settings-button-secondary" 
            onClick={handleReset}
            title="Reset all settings to defaults"
          >
            RESET DEFAULTS
          </button>
          <button 
            className="settings-button settings-button-primary" 
            onClick={onClose}
            title="Close settings dialog"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}; 