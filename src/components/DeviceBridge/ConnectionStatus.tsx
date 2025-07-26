import React from 'react';
import type { DeviceConnection } from '../../services/DeviceBridge/types';

interface ConnectionStatusProps {
  connection: DeviceConnection;
  onDisconnect: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  connection, 
  onDisconnect 
}) => {
  const getConnectionIcon = () => {
    switch (connection.type) {
      case 'bluetooth':
        return '🔵'; // Bluetooth icon
      case 'serial':
        return '🔌'; // USB icon
      default:
        return '📡'; // Generic connection icon
    }
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`connection-status ${connection.isConnected ? 'connected' : 'disconnected'}`}>
      <div className="connection-info">
        <div className="connection-header">
          <span className="connection-icon">{getConnectionIcon()}</span>
          <span className="connection-name">{connection.name}</span>
          <span className={`connection-indicator ${connection.isConnected ? 'online' : 'offline'}`}>
            {connection.isConnected ? '●' : '○'}
          </span>
        </div>
        
        <div className="connection-details">
          <span className="connection-type">{connection.type.toUpperCase()}</span>
          {connection.signal && (
            <span className="signal-strength">Signal: {connection.signal}%</span>
          )}
          <span className="last-seen">Last seen: {formatLastSeen(connection.lastSeen)}</span>
        </div>
      </div>
      
      <button
        className="btn btn-ghost btn-small disconnect-btn"
        onClick={onDisconnect}
        title="Disconnect device"
      >
        DISCONNECT
      </button>
    </div>
  );
};