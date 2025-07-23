import React, { useState, useRef, useEffect } from 'react';
import './Header.css';

interface Template {
  name: string;
  description: string;
  getCode: () => string;
}

interface HeaderProps {
  onSave?: () => void;
  onLoad?: () => void;
  onSettings?: () => void;
  templates?: Template[];
  onTemplateSelect?: (code: string) => void;
  toolName?: string;
  toolDescription?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSave, 
  onLoad, 
  onSettings,
  templates = [],
  onTemplateSelect,
  toolName = "DRO",
  toolDescription = "Datum Research Observatory"
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleTemplateSelect = (template: Template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template.getCode());
    }
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="dro-header">
      <div className="dro-header-content">
        <h1 className="dro-title">
          <span className="dro-title-main">{toolName}</span>
          <span className="dro-title-sub">{toolDescription}</span>
        </h1>
        
        <nav className="dro-nav">
          {templates.length > 0 && onTemplateSelect && (
            <div className="dro-nav-dropdown" ref={dropdownRef}>
              <button 
                className="dro-nav-button btn-secondary" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                title="Select a script template"
              >
                TEMPLATES
              </button>
              {isDropdownOpen && (
                <div className="dro-dropdown-menu">
                  {templates.map((template) => (
                    <button 
                      key={template.name}
                      className="dro-dropdown-item btn-secondary"
                      onClick={() => handleTemplateSelect(template)}
                      title={template.description}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onSave && (
            <button 
              className="dro-nav-button btn-secondary" 
              onClick={onSave}
              title="Save Script (Ctrl+S)"
            >
              SAVE SCRIPT
            </button>
          )}
          {onLoad && (
            <button 
              className="dro-nav-button btn-secondary" 
              onClick={onLoad}
              title="Load Script (Ctrl+O)"
            >
              LOAD SCRIPT
            </button>
          )}
          {onSettings && (
            <button 
              className="dro-nav-button btn-secondary" 
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