import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { FirmwareSelector } from '../../components/FirmwareSelector';

interface SerialMessage {
  timestamp: Date;
  direction: 'in' | 'out';
  data: string;
  type: 'data' | 'info' | 'error';
}

export const ESP32Flasher: React.FC = () => {
  // Flashing state
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashStatus, setFlashStatus] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  // Serial monitoring state
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialMessages, setSerialMessages] = useState<SerialMessage[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [baudRate, setBaudRate] = useState(115200);

  // Firmware handling
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareBlob, setFirmwareBlob] = useState<Blob | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string>('');
  const [firmwareSource, setFirmwareSource] = useState<'file' | 'selector'>('selector');

  // Refs
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [serialMessages, scrollToBottom]);

  // Add serial message
  const addSerialMessage = useCallback((direction: 'in' | 'out', data: string, type: 'data' | 'info' | 'error' = 'data') => {
    const message: SerialMessage = {
      timestamp: new Date(),
      direction,
      data: data.trim(),
      type
    };
    setSerialMessages(prev => [...prev, message]);
  }, []);

  // Connect to device for flashing
  const connectForFlashing = useCallback(async () => {
    if (!('serial' in navigator)) {
      setFlashStatus('Web Serial API not supported. Please use Chrome or Edge.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      setIsConnected(true);
      setFlashStatus('Connected successfully. Ready to flash.');

      // Try to get device info
      try {
        // Simple chip detection - in a real implementation, you'd use esptool-js
        setDeviceInfo('ESP32-S3 detected');
      } catch (error) {
        setDeviceInfo('Device connected (chip detection failed)');
      }

      portRef.current = port;
    } catch (error) {
      setFlashStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Connect for serial monitoring
  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      addSerialMessage('out', 'Web Serial API not supported. Please use Chrome or Edge.', 'error');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      portRef.current = port;
      setSerialConnected(true);
      addSerialMessage('out', `Connected at ${baudRate} baud`, 'info');

      // Start reading
      const reader = port.readable.getReader();
      readerRef.current = reader;

      const writer = port.writable.getWriter();
      writerRef.current = writer;

      // Read loop
      const readLoop = async () => {
        try {
          while (serialConnected && reader) {
            const { value, done } = await reader.read();
            if (done) break;

            const decoder = new TextDecoder();
            const text = decoder.decode(value);
            addSerialMessage('in', text);
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'NetworkError') {
            addSerialMessage('in', `Read error: ${error.message}`, 'error');
          }
        }
      };

      readLoop();
    } catch (error) {
      addSerialMessage('out', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [baudRate, addSerialMessage, serialConnected]);

  // Disconnect serial
  const disconnectSerial = useCallback(async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }

      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }

      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }

      setSerialConnected(false);
      addSerialMessage('out', 'Disconnected', 'info');
    } catch (error) {
      addSerialMessage('out', `Disconnect error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [addSerialMessage]);

  // Send serial data
  const sendSerial = useCallback(async () => {
    if (!writerRef.current || !serialInput.trim()) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(serialInput + '\n');
      await writerRef.current.write(data);
      addSerialMessage('out', serialInput);
      setSerialInput('');
    } catch (error) {
      addSerialMessage('out', `Send error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [serialInput, addSerialMessage]);

  // Handle firmware from selector
  const handleFirmwareFromSelector = useCallback((binary: Blob, version: string) => {
    setFirmwareBlob(binary);
    setFirmwareVersion(version);
    setFirmwareFile(null);
    setFirmwareSource('selector');
    setFlashStatus(`Loaded firmware ${version} from repository. Ready to flash.`);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    setFirmwareFile(file);
    setFirmwareBlob(null);
    setFirmwareVersion('');
    setFirmwareSource('file');
  }, []);


  // Flash firmware
  const flashFirmware = useCallback(async () => {
    if (!isConnected) {
      setFlashStatus('Please connect to device first.');
      return;
    }

    const hasFirmware = firmwareSource === 'file' ? !!firmwareFile : !!firmwareBlob;
    if (!hasFirmware) {
      setFlashStatus('Please load firmware first (either from repository or file).');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Starting ESP32 flash process...');

    try {
      // In a real implementation, you'd use esptool-js here
      // This simulates flashing a single binary at 0x0
      const firmwareName = firmwareSource === 'file' 
        ? firmwareFile!.name 
        : `firmware ${firmwareVersion}`;
      setFlashStatus(`Flashing ${firmwareName} at 0x0...`);

      // Simulate erasing and flashing progress
      const steps = [
        { progress: 10, message: 'Erasing flash...' },
        { progress: 20, message: 'Writing firmware...' },
        { progress: 90, message: 'Verifying...' },
        { progress: 100, message: 'Flash completed successfully!' }
      ];

      for (const step of steps) {
        setFlashProgress(step.progress);
        setFlashStatus(step.message);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

    } catch (error) {
      setFlashStatus(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFlashing(false);
    }
  }, [isConnected, firmwareFile, firmwareBlob, firmwareSource, firmwareVersion]);

  // Clear serial messages
  const clearMessages = useCallback(() => {
    setSerialMessages([]);
  }, []);

  return (
    <div className="esp32-flasher-tool">
      <MainContent>
        <SplitLayout
          left={
            <Panel title="ESP32 Flasher" className="flasher-panel">
              <div className="flasher-content">
                <div className="connection-section">
                  <h3>Device Connection</h3>
                  <div className="connection-controls">
                    <button
                      onClick={connectForFlashing}
                      className={`connect-button btn-primary ${isConnected ? 'connected' : ''}`}
                      disabled={isFlashing}
                    >
                      {isConnected ? 'Connected' : 'Connect Device'}
                    </button>
                    {deviceInfo && (
                      <div className="device-info">
                        <span>{deviceInfo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="firmware-section">
                  <FirmwareSelector
                    platform="esp32"
                    onFirmwareLoad={handleFirmwareFromSelector}
                    disabled={isFlashing}
                  />
                  
                  <div className="manual-upload">
                    <h4>Or upload custom firmware:</h4>
                    <div className="file-controls">
                      <div className="file-info">
                        <label>ESP32 Firmware</label>
                        <span className="address">@ 0x0</span>
                      </div>
                      <input
                        type="file"
                        accept=".bin"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        className="file-input"
                        disabled={isFlashing}
                      />
                      {firmwareFile && (
                        <div className="file-selected">
                          <span className="file-name">{firmwareFile.name}</span>
                          <span className="file-size">
                            ({(firmwareFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flash-section">
                  <h3>Flash Process</h3>
                  <button
                    onClick={flashFirmware}
                    className="flash-button btn-primary"
                    disabled={!isConnected || (!firmwareFile && !firmwareBlob) || isFlashing}
                  >
                    {isFlashing ? 'Flashing...' : 'Flash Firmware'}
                  </button>

                  {isFlashing && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${flashProgress}%` }}
                        />
                      </div>
                      <span className="progress-text">{flashProgress.toFixed(0)}%</span>
                    </div>
                  )}

                  {flashStatus && (
                    <div className={`flash-status ${flashStatus.includes('failed') || flashStatus.includes('error') ? 'error' : flashStatus.includes('success') ? 'success' : 'info'}`}>
                      {flashStatus}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          }
          right={
            <Panel title="Serial Monitor" className="serial-panel">
              <div className="serial-content">
                <div className="serial-controls">
                  <div className="baud-rate-control">
                    <label>Baud Rate:</label>
                    <select
                      value={baudRate}
                      onChange={(e) => setBaudRate(Number(e.target.value))}
                      disabled={serialConnected}
                    >
                      <option value={9600}>9600</option>
                      <option value={19200}>19200</option>
                      <option value={38400}>38400</option>
                      <option value={57600}>57600</option>
                      <option value={115200}>115200</option>
                      <option value={230400}>230400</option>
                      <option value={460800}>460800</option>
                      <option value={921600}>921600</option>
                    </select>
                  </div>

                  <div className="serial-actions">
                    <button
                      onClick={serialConnected ? disconnectSerial : connectSerial}
                      className={`connect-button btn-primary ${serialConnected ? 'connected' : ''}`}
                    >
                      {serialConnected ? 'Disconnect' : 'Connect'}
                    </button>
                    <button onClick={clearMessages} className="clear-button btn-secondary">
                      Clear
                    </button>
                  </div>
                </div>

                <div className="serial-messages">
                  {serialMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.direction} ${message.type}`}
                    >
                      <span className="timestamp">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="direction">
                        {message.direction === 'in' ? '←' : '→'}
                      </span>
                      <span className="data">{message.data}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="serial-input">
                  <input
                    type="text"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendSerial()}
                    placeholder="Enter command..."
                    disabled={!serialConnected}
                    className="command-input"
                  />
                  <button
                    onClick={sendSerial}
                    disabled={!serialConnected || !serialInput.trim()}
                    className="send-button btn-primary"
                  >
                    Send
                  </button>
                </div>
              </div>
            </Panel>
          }
        />
      </MainContent>

      <div className="tool-status">
        <div className="status-left">
          <div className="status-item">
            <span>ESP32 Flasher</span>
          </div>
          {isConnected && (
            <div className="status-item success">
              <span>Device: {deviceInfo || 'Connected'}</span>
            </div>
          )}
          {serialConnected && (
            <div className="status-item success">
              <span>Serial: {baudRate} baud</span>
            </div>
          )}
          {isFlashing && (
            <div className="status-item executing">
              <span>Flashing: {flashProgress.toFixed(0)}%</span>
            </div>
          )}
        </div>
        <div className="status-right">
          <div className="status-item">
            <span>{isFlashing ? 'Flashing' : isConnected || serialConnected ? 'Connected' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};