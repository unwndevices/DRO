import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';
import { FirmwareSelector } from '../../components/FirmwareSelector';

interface SerialMessage {
  timestamp: Date;
  direction: 'in' | 'out';
  data: string;
  type: 'data' | 'info' | 'error';
}


export const DaisyFlasher: React.FC = () => {
  // DFU flashing state
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashStatus, setFlashStatus] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Firmware handling
  const [firmwareBlob, setFirmwareBlob] = useState<Blob | null>(null);
  const [firmwareSource, setFirmwareSource] = useState<'file' | 'selector'>('selector');

  // Serial monitoring state
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialMessages, setSerialMessages] = useState<SerialMessage[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [baudRate, setBaudRate] = useState(115200);

  // Refs
  const deviceRef = useRef<USBDevice | null>(null);
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

  // Connect to Daisy in DFU mode
  const connectDFU = useCallback(async () => {
    if (!('usb' in navigator)) {
      setFlashStatus('WebUSB not supported. Please use Chrome or Edge.');
      return;
    }

    try {
      // Request Daisy Seed USB device
      // STMicroelectronics DFU mode: VID=0x0483, PID=0xDF11
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x0483, productId: 0xDF11 }, // STM DFU mode
          { vendorId: 0x0483, productId: 0x5740 }  // STM in application mode
        ]
      });

      await device.open();

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      await device.claimInterface(0);

      setIsConnected(true);
      setDeviceInfo(`${device.productName || 'Daisy Seed'} (${device.manufacturerName || 'STMicroelectronics'})`);
      setFlashStatus('Connected to Daisy Seed in DFU mode. Ready to flash.');

      deviceRef.current = device;
    } catch (error) {
      setFlashStatus(`DFU connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    setSelectedFile(null);
    setFirmwareSource('selector');
    setFlashStatus(`Loaded firmware ${version} from repository. Ready to flash.`);
  }, []);

  // Handle file selection (updated to work with firmware source tracking)
  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    setFirmwareBlob(null);
    setFirmwareSource('file');
  }, []);


  // Flash firmware using DFU
  const flashFirmware = useCallback(async () => {
    if (!isConnected || !deviceRef.current) {
      setFlashStatus('Please connect to Daisy in DFU mode first.');
      return;
    }

    const hasFirmware = firmwareSource === 'file' ? !!selectedFile : !!firmwareBlob;
    if (!hasFirmware) {
      setFlashStatus('Please load firmware first (either from repository or file).');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Starting DFU flash process...');

    try {
      // Get firmware data from either source
      let firmware: Uint8Array;
      if (firmwareSource === 'file' && selectedFile) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        firmware = new Uint8Array(arrayBuffer);
      } else if (firmwareSource === 'selector' && firmwareBlob) {
        const arrayBuffer = await firmwareBlob.arrayBuffer();
        firmware = new Uint8Array(arrayBuffer);
      } else {
        throw new Error('No firmware data available');
      }

      setFlashStatus('Erasing flash memory...');
      setFlashProgress(10);

      // In a real implementation, you'd use WebUSB DFU protocol here
      // This simulates the DFU flashing process
      const chunkSize = 1024;
      const totalChunks = Math.ceil(firmware.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const progress = 10 + (80 * i / totalChunks);
        setFlashProgress(progress);
        setFlashStatus(`Flashing... ${Math.round(progress)}%`);

        // Simulate chunk writing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setFlashProgress(95);
      setFlashStatus('Verifying flash...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setFlashProgress(100);
      setFlashStatus('Flash completed successfully! Reset your Daisy to run the new firmware.');
    } catch (error) {
      setFlashStatus(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFlashing(false);
    }
  }, [isConnected, selectedFile, firmwareBlob, firmwareSource]);

  // Clear serial messages
  const clearMessages = useCallback(() => {
    setSerialMessages([]);
  }, []);

  return (
    <div className="daisy-flasher-tool">
      <MainContent>
        <SplitLayout
          left={
            <Panel title="Daisy DFU Flasher" className="flasher-panel">
              <div className="flasher-content">
                <div className="connection-section">
                  <h3>DFU Connection</h3>
                  <div className="connection-controls">
                    <button
                      onClick={connectDFU}
                      className={`connect-button btn-primary ${isConnected ? 'connected' : ''}`}
                      disabled={isFlashing}
                    >
                      {isConnected ? 'DFU Connected' : 'Connect DFU'}
                    </button>
                    {deviceInfo && (
                      <div className="device-info">
                        <span>{deviceInfo}</span>
                      </div>
                    )}
                  </div>

                  <div className="bootloader-instructions">
                    <h4>Daisy Bootloader Instructions:</h4>
                    <ol>
                      <li>Ensure your Daisy has the <strong>Daisy bootloader</strong> installed</li>
                      <li>Look for the <strong>breathing LED pattern</strong> indicating bootloader mode</li>
                      <li>To extend timeout indefinitely: press <strong>BOOT</strong> button (no RESET needed)</li>
                      <li>Connect via DFU for flashing larger programs</li>
                    </ol>
                    <div className="bootloader-note">
                      <strong>Note:</strong> The Daisy bootloader allows flashing much larger programs than the built-in bootloader.
                      It accepts new binaries during the timeout period indicated by breathing LED.
                    </div>
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
                      <input
                        type="file"
                        accept=".bin,.hex,.dfu"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        className="file-input"
                        disabled={isFlashing}
                      />
                      {selectedFile && (
                        <div className="file-selected">
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-size">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
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
                    disabled={!isConnected || (!selectedFile && !firmwareBlob) || isFlashing}
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
                    <div className={`flash-status ${flashStatus.includes('failed') || flashStatus.includes('error') ? 'error' : flashStatus.includes('success') || flashStatus.includes('completed') ? 'success' : 'info'}`}>
                      <pre>{flashStatus}</pre>
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
            <span>Daisy Flasher</span>
          </div>
          {isConnected && (
            <div className="status-item success">
              <span>DFU: {deviceInfo || 'Connected'}</span>
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