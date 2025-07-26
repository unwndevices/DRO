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
  toolName = "DROP",
  toolDescription = "Datum Research Open Platform"
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
    <header className="drop-header">
      <div className="drop-header-content">
        <h1 className="drop-title">
          <span className="drop-title-main">{toolName}</span>
          <span className="drop-title-sub">{toolDescription}</span>
        </h1>

        <nav className="drop-nav">
          {templates.length > 0 && onTemplateSelect && (
            <div className="drop-nav-dropdown" ref={dropdownRef}>
              <button
                className="drop-nav-button btn-secondary"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                title="Select a script template"
              >
                TEMPLATES
              </button>
              {isDropdownOpen && (
                <div className="drop-dropdown-menu">
                  {templates.map((template) => (
                    <button
                      key={template.name}
                      className="drop-dropdown-item btn-secondary"
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
              className="drop-nav-button btn-secondary"
              onClick={onSave}
              title="Save Script (Ctrl+S)"
            >
              SAVE SCRIPT
            </button>
          )}
          {onLoad && (
            <button
              className="drop-nav-button btn-secondary"
              onClick={onLoad}
              title="Load Script (Ctrl+O)"
            >
              LOAD SCRIPT
            </button>
          )}
          {onSettings && (
            <button
              className="drop-nav-button btn-secondary"
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