import React from 'react';
import './Header.css';

interface HeaderProps {
  onSave?: () => void;
  onLoad?: () => void;
  onSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSave, onLoad, onSettings }) => {
  return (
    <header className="dro-header">
      <div className="dro-header-content">
        <h1 className="dro-title">
          <span className="dro-title-main">DRO</span>
          <span className="dro-title-sub">Datum Research Observatory</span>
        </h1>
        
        <nav className="dro-nav">
          {onSave && (
            <button 
              className="dro-nav-button" 
              onClick={onSave}
              title="Save Script (Ctrl+S)"
            >
              SAVE
            </button>
          )}
          {onLoad && (
            <button 
              className="dro-nav-button" 
              onClick={onLoad}
              title="Load Script (Ctrl+O)"
            >
              LOAD
            </button>
          )}
          {onSettings && (
            <button 
              className="dro-nav-button" 
              onClick={onSettings}
              title="Settings"
            >
              SETTINGS
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}; 