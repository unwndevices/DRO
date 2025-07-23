import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { FirmwareSelector } from '../../components/FirmwareSelector';
import { DFUDevice, findDfuInterfaces } from './dfu-webdfu';
import './DaisyFlasher.css';

interface SerialMessage {
  timestamp: Date;
  direction: 'in' | 'out';
  data: string;
  type: 'data' | 'info' | 'error';
}

export const DaisyFlasher: React.FC = () => {
  // Connection state
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
  const serialBufferRef = useRef<string>('');

  // Firmware handling
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareBlob, setFirmwareBlob] = useState<Blob | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string>('');
  const [firmwareSource, setFirmwareSource] = useState<'file' | 'selector'>('selector');

  // Full erase option
  const [fullErase, setFullErase] = useState(false);

  // DFU device ref
  const dfuDeviceRef = useRef<DFUDevice | null>(null);
  const serialPortRef = useRef<SerialPort | null>(null);
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

  // Connect to Daisy device via WebUSB
  const connectForFlashing = useCallback(async () => {
    if (!('usb' in navigator)) {
      setFlashStatus('WebUSB API not supported. Please use Chrome or Edge.');
      return;
    }

    try {
      // Request USB device with STM32 vendor ID
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0483 }, // STMicroelectronics
        ]
      });

      // Find DFU interface
      const interfaces = findDfuInterfaces(device);
      if (interfaces.length === 0) {
        throw new Error('No DFU interface found. Make sure device is in DFU mode.');
      }

      console.log('Found DFU interfaces:', interfaces);

      // List all interfaces for debugging
      interfaces.forEach((iface, index) => {
        console.log(`Interface ${index}: ${iface.name}, alt=${iface.alternate.alternateSetting}`);
      });

      // Use the first DFU interface (typically Flash interface)
      const dfuInterface = interfaces[0];
      const dfuDevice = new DFUDevice(device, dfuInterface);

      await dfuDevice.open();

      dfuDeviceRef.current = dfuDevice;
      setIsConnected(true);

      // Get device info
      const state = await dfuDevice.getState();
      console.log('DFU State:', state);

      setDeviceInfo(`Daisy Seed - ${dfuInterface.name || 'DFU Mode'}`);
      setFlashStatus('Connected to Daisy Seed. Ready to flash.');

    } catch (error) {
      setFlashStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      dfuDeviceRef.current = null;
    }
  }, []);

  // Connect for serial monitoring
  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      addSerialMessage('out', 'Web Serial API not supported. Please use Chrome or Edge.', 'error');
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      serialPortRef.current = port;
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
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const decoder = new TextDecoder();
            const text = decoder.decode(value);
            
            // Add to buffer
            serialBufferRef.current += text;
            
            // Process complete lines
            const lines = serialBufferRef.current.split(/\r?\n/);
            serialBufferRef.current = lines.pop() || ''; // Keep incomplete line in buffer
            
            // Display each complete line
            for (const line of lines) {
              if (line.trim()) {
                addSerialMessage('in', line);
              }
            }
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

      if (serialPortRef.current) {
        await serialPortRef.current.close();
        serialPortRef.current = null;
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
      const data = encoder.encode(serialInput + '\r\n');
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

  // Flash firmware via DFU
  const flashFirmware = useCallback(async () => {
    if (!isConnected || !dfuDeviceRef.current) {
      setFlashStatus('Please connect to device first.');
      return;
    }

    const hasFirmware = firmwareSource === 'file' ? !!firmwareFile : !!firmwareBlob;
    if (!hasFirmware) {
      setFlashStatus('Please load firmware first.');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Starting Daisy flash process...');

    try {
      const device = dfuDeviceRef.current;

      // Get firmware data
      let firmwareData: ArrayBuffer;
      const firmwareName = firmwareSource === 'file'
        ? firmwareFile!.name
        : `firmware ${firmwareVersion}`;

      if (firmwareSource === 'file' && firmwareFile) {
        firmwareData = await firmwareFile.arrayBuffer();
      } else if (firmwareBlob) {
        firmwareData = await firmwareBlob.arrayBuffer();
      } else {
        throw new Error('No firmware data available');
      }

      console.log(`Flashing ${firmwareData.byteLength} bytes`);

      // Clear any error status
      try {
        await device.clearStatus();
      } catch (e) {
        console.warn('Clear status failed, continuing...', e);
      }

      // Set up progress monitoring
      device.logProgress = (done: number, total: number) => {
        const percent = Math.round((done / total) * 100);
        setFlashProgress(percent);
        setFlashStatus(`Downloading... ${percent}% (${done} / ${total} bytes)`);
      };

      device.logInfo = (msg: string) => {
        console.log('DFU:', msg);
        setFlashStatus(msg);
      };

      device.logWarning = (msg: string) => {
        console.warn('DFU:', msg);
        setFlashStatus(`Warning: ${msg}`);
      };

      device.logError = (msg: string) => {
        console.error('DFU:', msg);
        setFlashStatus(`Error: ${msg}`);
      };

      device.logDebug = (msg: string) => {
        console.debug('DFU:', msg);
      };

      // Download firmware using the webdfu-compatible method
      await device.do_download(device.transferSize, firmwareData, true, fullErase);

      setFlashProgress(100);
      setFlashStatus('File downloaded successfully. Daisy will restart with new firmware.');

    } catch (error) {
      console.error('Flash error:', error);
      setFlashStatus(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFlashing(false);
    }
  }, [isConnected, firmwareFile, firmwareBlob, firmwareSource, firmwareVersion, fullErase]);

  // Disconnect DFU
  const disconnectDFU = useCallback(async () => {
    if (dfuDeviceRef.current) {
      try {
        await dfuDeviceRef.current.close();
      } catch (e) {
        console.warn('DFU disconnect error:', e);
      }
      dfuDeviceRef.current = null;
      setIsConnected(false);
      setDeviceInfo('');
      setFlashStatus('Disconnected');
    }
  }, []);

  // Clear serial messages
  const clearMessages = useCallback(() => {
    setSerialMessages([]);
  }, []);

  return (
    <div className="daisy-flasher-tool">
      <MainContent>
        <SplitLayout
          left={
            <Panel title="Daisy Seed Flasher" className="flasher-panel">
              <div className="flasher-content">
                <div className="connection-section">
                  <h3>Device Connection</h3>
                  <div className="connection-controls">
                    <button
                      onClick={isConnected ? disconnectDFU : connectForFlashing}
                      className={`connect-button btn-primary ${isConnected ? 'connected' : ''}`}
                      disabled={isFlashing}
                    >
                      {isConnected ? 'Disconnect' : 'Connect Device (DFU Mode)'}
                    </button>
                  </div>
                  <div className="dfu-instructions">
                    <p>To enter DFU mode on Daisy Seed:</p>
                    <ol>
                      <li>Hold BOOT button</li>
                      <li>Press and release RESET</li>
                      <li>Release BOOT (LED will blink)</li>
                    </ol>
                  </div>
                </div>

                <div className="firmware-section">
                  <FirmwareSelector
                    platform="daisy"
                    onFirmwareLoad={handleFirmwareFromSelector}
                    disabled={isFlashing}
                  />

                  <div className="manual-upload">
                    <h4>Or upload custom firmware:</h4>
                    <div className="file-controls">
                      <div className="file-info">
                        <label>Daisy Firmware (.bin)</label>
                        <span className="address">@ 0x90040000</span>
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
                  <div className="erase-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={fullErase}
                        onChange={(e) => setFullErase(e.target.checked)}
                        disabled={isFlashing}
                      />
                      &nbsp;Perform full erase before flashing (slower)
                    </label>
                  </div>
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
            <span>Daisy Seed Flasher</span>
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