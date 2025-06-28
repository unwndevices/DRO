import React from 'react';
import { luaService } from '../../services/LuaEngine/LuaService';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  onTemplateSelect: (template: string) => void;
  className?: string;
}

interface Template {
  name: string;
  description: string;
  getCode: () => string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  className = ''
}) => {
  const templates: Template[] = [
    {
      name: 'Simple Test',
      description: 'Basic test: band index pattern',
      getCode: () => luaService.getSimpleTestTemplate()
    },
    {
      name: 'Diagonal Test',
      description: 'Band i lights up at frame i',
      getCode: () => luaService.getDiagonalTestTemplate()
    },
    {
      name: 'Default Spectral',
      description: 'Frequency-based sine wave with bass boost',
      getCode: () => luaService.getDefaultTemplate()
    },
    {
      name: 'Simple Sine Wave',
      description: 'Basic sine wave across all bands',
      getCode: () => luaService.getSineWaveTemplate()
    },
    {
      name: 'Frequency Response',
      description: 'Low-pass filter response curve',
      getCode: () => luaService.getFrequencyResponseTemplate()
    },
    {
      name: 'Band Index Pattern',
      description: 'Pattern based on band index',
      getCode: () => `-- Band index pattern
function process()
    -- Create a pattern based on band index
    local pattern = (i + 1) / i_amt
    return pattern * pattern  -- Quadratic curve
end`
    },
    {
      name: 'Time Animation',
      description: 'Simple time-based animation',
      getCode: () => `-- Time-based animation
function process()
    -- Animate all bands together over time
    local time = f / f_amt
    local wave = sin(2 * pi() * time * 2)
    return clamp(0.5 + 0.5 * wave, 0, 1)
end`
    },
    {
      name: 'Frequency Sweep',
      description: 'Sweeping frequency response',
      getCode: () => `-- Frequency sweep pattern
function process()
    -- Calculate frequency for this band
    local freq = 80 * pow(8000/80, i/(i_amt-1))
    
    -- Create a sweeping cutoff frequency
    local time = f / f_amt
    local cutoff = 200 + 1800 * (0.5 + 0.5 * sin(2 * pi() * time))
    
    -- Low-pass response
    return 1 / (1 + pow(freq/cutoff, 4))
end`
    }
  ];

  const handleTemplateSelect = (template: Template) => {
    const code = template.getCode();
    onTemplateSelect(code);
  };

  return (
    <div className={`dro-template-selector ${className}`}>
      <div className="dro-template-header">
        <span className="dro-template-title">Templates</span>
      </div>
      
      <div className="dro-template-grid">
        {templates.map((template, index) => (
          <button
            key={index}
            className="dro-template-item"
            onClick={() => handleTemplateSelect(template)}
            title={template.description}
          >
            <span className="dro-template-name">{template.name}</span>
            <span className="dro-template-desc">{template.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 