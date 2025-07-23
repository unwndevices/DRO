import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { FirmwareSelector } from '../../components/FirmwareSelector';
import { ESPLoader, Transport } from 'esptool-js';

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
  const serialBufferRef = useRef<string>('');

  // Firmware handling
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareBlob, setFirmwareBlob] = useState<Blob | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string>('');
  const [firmwareSource, setFirmwareSource] = useState<'file' | 'selector'>('selector');

  // Refs
  const portRef = useRef<SerialPort | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const espLoaderRef = useRef<ESPLoader | null>(null);
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
      // Request port but don't open it yet - let Transport handle the opening
      const port = await (navigator as any).serial.requestPort();
      
      // Create transport (it will handle the connection internally)
      const transport = new Transport(port);
      
      // Store references immediately
      portRef.current = port;
      transportRef.current = transport;
      setIsConnected(true);
      setFlashStatus('Connected successfully. Detecting chip...');

      // Try to get device info using esptool-js
      try {
        const esploader = new ESPLoader({
          transport: transport,
          baudrate: 115200,
          romBaudrate: 115200
        });

        const chip = await esploader.main();
        setDeviceInfo(`${chip} detected`);
        setFlashStatus('Device detected successfully. Ready to flash.');
        
        // Store the ESPLoader instance for reuse
        espLoaderRef.current = esploader;
        
        // Reset the chip to get back to normal state
        await esploader.after('hard_reset');
      } catch (error) {
        console.warn('Chip detection failed:', error);
        setDeviceInfo('ESP32 device connected (detection failed)');
        setFlashStatus('Connected successfully. Ready to flash.');
        
        // Create a basic ESPLoader instance for flashing even if detection failed
        const esploader = new ESPLoader({
          transport: transport,
          baudrate: 115200,
          romBaudrate: 115200
        });
        espLoaderRef.current = esploader;
      }
    } catch (error) {
      setFlashStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      portRef.current = null;
      transportRef.current = null;
      espLoaderRef.current = null;
    }
  }, []);

  // Connect for serial monitoring
  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      addSerialMessage('out', 'Web Serial API not supported. Please use Chrome or Edge.', 'error');
      return;
    }

    try {
      let port: SerialPort;
      
      // If we already have a connected port from flashing, reuse it
      if (portRef.current && isConnected) {
        port = portRef.current;
        addSerialMessage('out', `Reusing existing connection at ${baudRate} baud`, 'info');
      } else {
        // Request new port and open it
        port = await (navigator as any).serial.requestPort();
        await port.open({
          baudRate: baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          flowControl: 'none'
        });
        portRef.current = port;
        addSerialMessage('out', `Connected at ${baudRate} baud`, 'info');
      }

      setSerialConnected(true);

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


  // Flash firmware
  const flashFirmware = useCallback(async () => {
    if (!isConnected || !espLoaderRef.current) {
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
      // Get the firmware data
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

      setFlashStatus('Preparing ESP32 for flashing...');
      setFlashProgress(5);

      // Disconnect the old transport cleanly
      setFlashStatus('Preparing connection for flashing...');
      if (transportRef.current) {
        try {
          await transportRef.current.disconnect();
        } catch (e) {
          console.warn('Transport disconnect warning:', e);
        }
      }

      // Create a fresh transport and loader for flashing  
      const port = portRef.current!;
      const transport = new Transport(port);
      const esploader = new ESPLoader({
        transport: transport,
        baudrate: 115200,
        romBaudrate: 115200
      });

      // Connect and sync with the chip for flashing
      setFlashStatus('Connecting to chip for flashing...');
      await esploader.main();
      setFlashProgress(15);
      
      // Update references
      transportRef.current = transport;
      
      // Change baud rate for faster flashing
      setFlashStatus('Changing baudrate for faster flashing...');
      await esploader.changeBaud();
      setFlashProgress(25);

      // Flash the firmware using writeFlash
      setFlashStatus(`Flashing ${firmwareName} (${(firmwareData.byteLength / 1024).toFixed(1)} KB)...`);
      
      // Convert ArrayBuffer to string for esptool-js
      const uint8Array = new Uint8Array(firmwareData);
      let dataString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        dataString += String.fromCharCode(uint8Array[i]);
      }

      // For simplicity and compatibility with other flashers, always flash at 0x0
      // This matches the behavior of most ESP32 web flashers
      const flashAddress = 0x0;

      const fileArray = [{
        data: dataString,
        address: flashAddress
      }];

      setFlashStatus(`Flashing ${firmwareName} at 0x${flashAddress.toString(16).toUpperCase()}...`);

      // For ESP32-S3, we know it has 8MB flash from the detection logs
      // Let's be explicit about this to match what esptool detected
      const detectedFlashSize = '8MB';
      setFlashStatus(`Using ${detectedFlashSize} flash size, starting write...`);

      await esploader.writeFlash({
        fileArray: fileArray,
        flashSize: detectedFlashSize,
        flashMode: 'dio',
        flashFreq: '40m',  // More conservative frequency
        eraseAll: true,    // Erase all flash before writing - matches other flashers
        compress: true,
        // Progress callback
        reportProgress: (_fileIndex, written, total) => {
          const progress = 25 + (written / total) * 65; // 25% to 90%
          setFlashProgress(progress);
        }
      });

      setFlashProgress(90);
      setFlashStatus('Resetting chip...');
      
      // Reset the chip
      await esploader.after('hard_reset');
      setFlashProgress(100);
      
      setFlashStatus('Flash completed successfully! Device is resetting...');

    } catch (error) {
      console.error('Flash error:', error);
      setFlashStatus(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFlashing(false);
      // Don't disconnect here - user might want to use serial monitor
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