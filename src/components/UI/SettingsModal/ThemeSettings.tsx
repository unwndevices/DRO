import React, { useRef, useCallback } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';

export const ThemeSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  
  // Use timeout refs to debounce color updates
  const accentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced accent color handler - only updates after user stops changing color
  const handleAccentColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    
    // Clear existing timeout
    if (accentTimeoutRef.current) {
      clearTimeout(accentTimeoutRef.current);
    }
    
    // Set new timeout - only update after 300ms of no changes
    accentTimeoutRef.current = setTimeout(() => {
      updateSettings({
        theme: {
          ...settings.theme,
          accentColor: newColor
        }
      });
    }, 300);
  }, [settings.theme, updateSettings]);

  // Debounced background color handler - only updates after user stops changing color  
  const handleBackgroundColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    
    // Clear existing timeout
    if (backgroundTimeoutRef.current) {
      clearTimeout(backgroundTimeoutRef.current);
    }
    
    // Set new timeout - only update after 300ms of no changes
    backgroundTimeoutRef.current = setTimeout(() => {
      updateSettings({
        theme: {
          ...settings.theme,
          backgroundColor: newColor
        }
      });
    }, 300);
  }, [settings.theme, updateSettings]);

  return (
    <div className="theme-settings">
      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Accent Color</div>
          <div className="settings-control-description">
            Primary interface color - lighter and darker variants will be generated automatically
          </div>
        </div>
        <div className="settings-control-input">
          <input
            type="color"
            value={settings.theme.accentColor}
            onChange={handleAccentColorChange}
            className="settings-color-input"
            title="Select accent color"
            aria-label="Accent color picker"
          />
        </div>
      </div>

      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Background Color</div>
          <div className="settings-control-description">
            Base background color - secondary and tertiary variants will be generated automatically
          </div>
        </div>
        <div className="settings-control-input">
          <input
            type="color"
            value={settings.theme.backgroundColor}
            onChange={handleBackgroundColorChange}
            className="settings-color-input"
            title="Select background color"
            aria-label="Background color picker"
          />
        </div>
      </div>
    </div>
  );
}; 