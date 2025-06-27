import React from 'react';
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
  return (
    <div className="dro-split-layout">
      <div className="dro-split-left">
        {left}
      </div>
      <div className="dro-split-divider"></div>
      <div className="dro-split-right">
        {right}
      </div>
    </div>
  );
}; 