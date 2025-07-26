import React, { useState, useEffect } from 'react';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { DeviceConnection, DeviceParameter } from '../../services/DeviceBridge/types';
import { ParameterControl } from './ParameterControl';
import { ConnectionStatus } from './ConnectionStatus';
import './DeviceConnectionPanel.css';

interface DeviceConnectionPanelProps {
  deviceService: DeviceService;
}

export const DeviceConnectionPanel: React.FC<DeviceConnectionPanelProps> = ({ 
  deviceService 
}) => {
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [parameters, setParameters] = useState<DeviceParameter[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Mock parameters for demonstration
  const mockParameters: DeviceParameter[] = [
    // Slider parameters
    { id: 'gain', name: 'Gain', type: 'float', value: 0.75, min: 0, max: 1, unit: 'dB' },
    { id: 'cutoff', name: 'Cutoff Freq', type: 'float', value: 440, min: 20, max: 20000, unit: 'Hz' },
    { id: 'resonance', name: 'Resonance', type: 'float', value: 0.3, min: 0, max: 1 },
    { id: 'drive', name: 'Drive', type: 'float', value: 0.5, min: 0, max: 2 },
    
    // Toggle parameters  
    { id: 'bypass', name: 'Bypass', type: 'bool', value: false },
    { id: 'sync', name: 'Tempo Sync', type: 'bool', value: true },
    { id: 'invert', name: 'Phase Invert', type: 'bool', value: false },
    { id: 'mono', name: 'Mono Mode', type: 'bool', value: false }
  ];

  useEffect(() => {
    // Setup event listeners
    const handleDeviceConnected = () => {
      setConnections(deviceService.getConnections());
      setConnectionError(null);
      setIsConnecting(false);
    };

    const handleDeviceDisconnected = () => {
      setConnections(deviceService.getConnections());
    };

    const handleDeviceInfo = () => {
      setParameters(deviceService.getParameters());
    };

    const handleConnectionError = (event: any) => {
      setConnectionError(event.payload.error);
      setIsConnecting(false);
    };

    deviceService.addEventListener('DEVICE_CONNECTED', handleDeviceConnected);
    deviceService.addEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
    deviceService.addEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
    deviceService.addEventListener('CONNECTION_ERROR', handleConnectionError);

    // Initial state
    setConnections(deviceService.getConnections());
    setParameters(deviceService.getParameters());

    return () => {
      deviceService.removeEventListener('DEVICE_CONNECTED', handleDeviceConnected);
      deviceService.removeEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
      deviceService.removeEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
      deviceService.removeEventListener('CONNECTION_ERROR', handleConnectionError);
    };
  }, [deviceService]);

  const handleBluetoothConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await deviceService.connectBluetooth();
    } catch {
      // Error handled by event listener
    }
  };

  const handleSerialConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await deviceService.connectSerial();
    } catch {
      // Error handled by event listener
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await deviceService.disconnect(connectionId);
  };


  const handleParameterChange = async (parameterId: string, value: number | boolean | string) => {
    try {
      await deviceService.updateParameter(parameterId, value);
    } catch (error) {
      console.error('Failed to update parameter:', error);
    }
  };

  return (
    <div className="device-connection-panel">
      <div className="panel-header">
        <h3 className="panel-title">EISEI DEVICE BRIDGE</h3>
      </div>

      <div className="connection-section">
        <h4 className="section-title">CONNECTION</h4>
        
        {connections.length === 0 ? (
          <div className="connection-buttons">
            <button
              className="btn btn-primary connection-btn"
              onClick={handleBluetoothConnect}
              disabled={isConnecting}
              title="Connect via Bluetooth Low Energy"
            >
              {isConnecting ? 'CONNECTING...' : 'BLUETOOTH'}
            </button>
            
            <button
              className="btn btn-primary connection-btn"
              onClick={handleSerialConnect}
              disabled={isConnecting}
              title="Connect via USB Serial"
            >
              {isConnecting ? 'CONNECTING...' : 'USB SERIAL'}
            </button>
            
          </div>
        ) : (
          <div className="active-connections">
            {connections.map(connection => (
              <ConnectionStatus
                key={connection.id}
                connection={connection}
                onDisconnect={() => handleDisconnect(connection.id)}
              />
            ))}
          </div>
        )}

        {connectionError && (
          <div className="connection-error">
            <p className="error-message">{connectionError}</p>
            <button 
              className="btn btn-ghost btn-small"
              onClick={() => setConnectionError(null)}
            >
              DISMISS
            </button>
          </div>
        )}
      </div>

      {/* Parameter Control Cards */}
      {(parameters.length > 0 || connections.length === 0) && (
        <>
          {/* Slider Controls Card */}
          <div className="control-card">
            <h4 className="card-title">AUDIO CONTROLS</h4>
            <div className="parameters-grid">
              {(parameters.length > 0 ? parameters : mockParameters)
                .filter(param => param.type === 'float' || param.type === 'int')
                .map(parameter => (
                  <ParameterControl
                    key={parameter.id}
                    parameter={parameter}
                    onChange={(value) => handleParameterChange(parameter.id, value)}
                  />
                ))}
            </div>
          </div>

          {/* Toggle Controls Card */}
          <div className="control-card">
            <h4 className="card-title">PROCESSING OPTIONS</h4>
            <div className="toggles-grid">
              {(parameters.length > 0 ? parameters : mockParameters)
                .filter(param => param.type === 'bool')
                .map(parameter => (
                  <ParameterControl
                    key={parameter.id}
                    parameter={parameter}
                    onChange={(value) => handleParameterChange(parameter.id, value)}
                  />
                ))}
            </div>
          </div>
        </>
      )}

      {connections.length === 0 && (
        <div className="connection-info">
          <p className="info-text">
            Preview controls shown above. Connect your Eisei device via Bluetooth or USB to access real-time control and data visualization.
          </p>
          <div className="capabilities-list">
            <h5>Features:</h5>
            <ul>
              <li>Real-time parameter control</li>
              <li>Live spectral data visualization</li>
              <li>Performance monitoring</li>
              <li>Automatic parameter discovery</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};