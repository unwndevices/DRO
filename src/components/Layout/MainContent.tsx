import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import './MainContent.css';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  return (
    <main className="dro-main-content">
      {children}
    </main>
  );
};

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`dro-panel ${className}`}>
      <div className="dro-panel-header">
        <h2 className="dro-panel-title">{title}</h2>
      </div>
      <div className="dro-panel-content">
        {children}
      </div>
    </div>
  );
};

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({ left, right }) => {
  const { settings } = useSettings();
  
  // Determine which panel contains the editor based on flip state
  // When flipped, the editor (left prop) is on the right side
  // When not flipped, the editor (left prop) is on the left side
  const editorOnLeft = !settings.layout.flipUI;
  
  // Determine layout classes based on settings
  const layoutClasses = [
    'dro-split-layout',
    settings.layout.biggerEditor ? 'bigger-editor' : 'normal-split',
    settings.layout.flipUI ? 'flipped' : ''
  ].filter(Boolean).join(' ');

  // Conditionally swap left and right based on flipUI setting
  const leftPanel = settings.layout.flipUI ? right : left;
  const rightPanel = settings.layout.flipUI ? left : right;

  return (
    <div className={layoutClasses}>
      <div className={`dro-split-left ${settings.layout.biggerEditor && editorOnLeft ? 'editor-panel' : ''}`}>
        {leftPanel}
      </div>
      <div className="dro-split-divider"></div>
      <div className={`dro-split-right ${settings.layout.biggerEditor && !editorOnLeft ? 'editor-panel' : ''}`}>
        {rightPanel}
      </div>
    </div>
  );
}; 