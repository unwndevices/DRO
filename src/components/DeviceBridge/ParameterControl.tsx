import React, { useState } from 'react';
import type { DeviceParameter } from '../../services/DeviceBridge/types';

interface ParameterControlProps {
  parameter: DeviceParameter;
  onChange: (value: number | boolean | string) => void;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({ 
  parameter, 
  onChange 
}) => {
  const [localValue, setLocalValue] = useState(parameter.value);

  const handleChange = (newValue: number | boolean | string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderControl = () => {
    switch (parameter.type) {
      case 'float':
      case 'int': {
        const numValue = typeof localValue === 'number' ? localValue : 0;
        const step = parameter.step || (parameter.type === 'int' ? 1 : 0.01);
        
        return (
          <div className="numeric-control">
            <input
              type="range"
              min={parameter.min || 0}
              max={parameter.max || 100}
              step={step}
              value={numValue}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              className="parameter-slider"
            />
            <input
              type="number"
              min={parameter.min}
              max={parameter.max}
              step={step}
              value={numValue}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              className="parameter-input"
            />
          </div>
        );
      }
      case 'bool': {
        const boolValue = typeof localValue === 'boolean' ? localValue : false;
        
        return (
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={boolValue}
              onChange={(e) => handleChange(e.target.checked)}
              className="parameter-checkbox"
            />
            <span className="toggle-slider"></span>
          </label>
        );
      }
      case 'enum': {
        const enumValue = typeof localValue === 'string' ? localValue : parameter.options?.[0] || '';
        
        return (
          <select
            value={enumValue}
            onChange={(e) => handleChange(e.target.value)}
            className="parameter-select"
          >
            {parameter.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }
      default:
        return (
          <input
            type="text"
            value={String(localValue)}
            onChange={(e) => handleChange(e.target.value)}
            className="parameter-text"
          />
        );
    }
  };

  const formatValue = () => {
    if (parameter.type === 'bool') {
      return localValue ? 'ON' : 'OFF';
    }
    if (parameter.type === 'float' && typeof localValue === 'number') {
      return localValue.toFixed(2);
    }
    return String(localValue);
  };

  const showValueDisplay = parameter.type === 'bool';

  return (
    <div className="parameter-control">
      <div className="parameter-header">
        <label className="parameter-label">
          {parameter.name}
          {parameter.unit && ` (${parameter.unit})`}
        </label>
        {showValueDisplay && (
          <span className="parameter-value">
            {formatValue()}
          </span>
        )}
      </div>
      
      <div className="parameter-input-container">
        {renderControl()}
      </div>
      
      {parameter.description && (
        <p className="parameter-description">{parameter.description}</p>
      )}
      
      {(parameter.min !== undefined || parameter.max !== undefined) && parameter.type !== 'bool' && (
        <div className="parameter-range">
          <span className="range-min">{parameter.min}</span>
          <span className="range-max">{parameter.max}</span>
        </div>
      )}
    </div>
  );
};