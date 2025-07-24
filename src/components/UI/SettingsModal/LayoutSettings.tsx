import React from 'react';
import { useSettings } from '../../../contexts/SettingsContext';

export const LayoutSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const handleFlipUIChange = () => {
    updateSettings({
      layout: {
        ...settings.layout,
        flipUI: !settings.layout.flipUI
      }
    });
  };

  const handleBiggerEditorChange = () => {
    updateSettings({
      layout: {
        ...settings.layout,
        biggerEditor: !settings.layout.biggerEditor
      }
    });
  };

  return (
    <div className="layout-settings">
      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Flip UI Layout</div>
          <div className="settings-control-description">
            Swap the positions of the editor and visualizer panels
          </div>
        </div>
        <div className="settings-control-input">
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.layout.flipUI}
              onChange={handleFlipUIChange}
              title={`${settings.layout.flipUI ? 'Disable' : 'Enable'} UI layout flip`}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Bigger Editor</div>
          <div className="settings-control-description">
            Give the text editor 70% of the screen width (also available via 'F' key)
          </div>
        </div>
        <div className="settings-control-input">
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.layout.biggerEditor}
              onChange={handleBiggerEditorChange}
              title={`${settings.layout.biggerEditor ? 'Disable' : 'Enable'} bigger editor layout`}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}; 