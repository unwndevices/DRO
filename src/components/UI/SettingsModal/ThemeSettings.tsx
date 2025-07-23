import React, { useRef, useCallback } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';

export const ThemeSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  
  // Use timeout refs to debounce color updates
  const accentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced text color handler - only updates after user stops changing color
  const handleTextColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    
    // Clear existing timeout
    if (textTimeoutRef.current) {
      clearTimeout(textTimeoutRef.current);
    }
    
    // Set new timeout - only update after 300ms of no changes
    textTimeoutRef.current = setTimeout(() => {
      updateSettings({
        theme: {
          ...settings.theme,
          textColor: newColor
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

      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Text Color</div>
          <div className="settings-control-description">
            Primary text color - used for most interface text elements
          </div>
        </div>
        <div className="settings-control-input">
          <input
            type="color"
            value={settings.theme.textColor}
            onChange={handleTextColorChange}
            className="settings-color-input"
            title="Select text color"
            aria-label="Text color picker"
          />
        </div>
      </div>
    </div>
  );
}; 