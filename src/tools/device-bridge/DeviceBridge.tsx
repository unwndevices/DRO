import React, { useState, useCallback, useEffect } from 'react';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { DeviceConnectionPanel, RealTimeDataChart } from '../../components/DeviceBridge';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { DeviceInfo, RealTimeData } from '../../services/DeviceBridge/types';

// Singleton DeviceService instance
let deviceServiceInstance: DeviceService | null = null;
const getDeviceService = (): DeviceService => {
  if (!deviceServiceInstance) {
    deviceServiceInstance = new DeviceService();
  }
  return deviceServiceInstance;
};

export const DeviceBridge: React.FC = () => {
  const [deviceService] = useState(() => getDeviceService());
  const [connectionCount, setConnectionCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('No devices connected');

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      const connections = deviceService.getConnections();
      const connectedCount = connections.filter(conn => conn.isConnected).length;
      setConnectionCount(connectedCount);
      
      if (connectedCount === 0) {
        setStatusMessage('No devices connected');
      } else if (connectedCount === 1) {
        setStatusMessage(`1 device connected`);
      } else {
        setStatusMessage(`${connectedCount} devices connected`);
      }
    };

    const handleDeviceConnected = () => {
      updateStatus();
      console.log('DROP Device Bridge: Device connected');
    };

    const handleDeviceDisconnected = () => {
      updateStatus();
      console.log('DROP Device Bridge: Device disconnected');
    };

    const handleDeviceInfo = (event: any) => {
      const info: DeviceInfo = event.payload.info;
      setDeviceInfo(info);
      console.log('DROP Device Bridge: Device info received:', info);
    };

    const handleDataReceived = (event: any) => {
      // Extract data for timestamp tracking (processing handled by RealTimeDataChart)
      event.payload.data as RealTimeData;
      setLastDataUpdate(new Date());
    };

    const handleConnectionError = (event: any) => {
      console.error('DROP Device Bridge: Connection error:', event.payload.error);
      setStatusMessage(`Connection error: ${event.payload.error}`);
    };

    // Register event listeners
    deviceService.addEventListener('DEVICE_CONNECTED', handleDeviceConnected);
    deviceService.addEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
    deviceService.addEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
    deviceService.addEventListener('DATA_RECEIVED', handleDataReceived);
    deviceService.addEventListener('CONNECTION_ERROR', handleConnectionError);

    // Initial status update
    updateStatus();

    return () => {
      deviceService.removeEventListener('DEVICE_CONNECTED', handleDeviceConnected);
      deviceService.removeEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
      deviceService.removeEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
      deviceService.removeEventListener('DATA_RECEIVED', handleDataReceived);
      deviceService.removeEventListener('CONNECTION_ERROR', handleConnectionError);
    };
  }, [deviceService]);

  // Check browser compatibility
  const checkBrowserSupport = useCallback(() => {
    const support = {
      bluetooth: 'bluetooth' in navigator,
      serial: 'serial' in navigator,
    };
    
    if (!support.bluetooth && !support.serial) {
      setStatusMessage('Browser does not support Web Bluetooth or Web Serial APIs');
    }
    
    return support;
  }, []);

  useEffect(() => {
    checkBrowserSupport();
  }, [checkBrowserSupport]);

  const formatLastUpdate = () => {
    if (!lastDataUpdate) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastDataUpdate.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return 'Over 1h ago';
  };

  return (
    <div className="device-bridge-tool">
      <MainContent>
        <SplitLayout
          left={
            <Panel title="DEVICE CONNECTION" className="device-panel">
              <DeviceConnectionPanel deviceService={deviceService} />
            </Panel>
          }
        
        right={
          <Panel title="REAL-TIME DATA" className="visualization-panel">
            <RealTimeDataChart 
              deviceService={deviceService}
              className="main-chart"
            />
            
            {connectionCount === 0 && (
              <div className="no-data-state">
                <div className="no-data-content">
                  <div className="no-data-icon">📡</div>
                  <h3>No Device Connected</h3>
                  <p>
                    Connect your Eisei device to see real-time spectral data, 
                    performance metrics, and interactive parameter controls.
                  </p>
                  <div className="supported-devices">
                    <h4>Supported Devices:</h4>
                    <ul>
                      <li>Eisei ESP32-S3 Audio Processor</li>
                      <li>Eisei Daisy Seed Audio Engine</li>
                      <li>Custom hardware with compatible protocol</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {deviceInfo && (
              <div className="device-capabilities">
                <h4>Device Capabilities</h4>
                <div className="capabilities-grid">
                  {deviceInfo.capabilities.map((capability, index) => (
                    <div key={index} className="capability-tag">
                      {capability}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        }
      />
    </MainContent>

    <div className="tool-status">
      <div className="status-left">
        <div className="status-item">
          <span>Device Bridge</span>
        </div>
        {connectionCount > 0 && (
          <div className="status-item success">
            <span>Status: {statusMessage}</span>
          </div>
        )}
        {deviceInfo && (
          <div className="status-item success">
            <span>Device: {deviceInfo.name} v{deviceInfo.version}</span>
          </div>
        )}
        {lastDataUpdate && (
          <div className="status-item">
            <span>Data: {formatLastUpdate()}</span>
          </div>
        )}
      </div>
      <div className="status-right">
        <div className="status-item">
          <span>{connectionCount > 0 ? 'Connected' : 'Ready'}</span>
        </div>
      </div>
    </div>
  </div>
  );
};