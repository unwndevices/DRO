// Simplified DFU implementation for Daisy Seed flasher
// Based on webdfu by devanlai (https://github.com/devanlai/webdfu)

export const DFU = {
  DETACH: 0x00,
  DNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  GETSTATE: 0x05,
  ABORT: 0x06,
};

export const DFU_STATE = {
  appIDLE: 0,
  appDETACH: 1,
  dfuIDLE: 2,
  dfuDNLOAD_SYNC: 3,
  dfuDNBUSY: 4,
  dfuDNLOAD_IDLE: 5,
  dfuMANIFEST_SYNC: 6,
  dfuMANIFEST: 7,
  dfuMANIFEST_WAIT_RESET: 8,
  dfuUPLOAD_IDLE: 9,
  dfuERROR: 10,
};

export const DFU_STATUS = {
  OK: 0x00,
};

// DfuSe specific commands
const DFUSE_SET_ADDRESS = 0x21;
const DFUSE_ERASE = 0x41;

export interface DFUInterface {
  configuration: USBConfiguration;
  interface: USBInterface;
  alternate: USBAlternateInterface;
  name: string | null;
}

export class DFUDevice {
  private device: USBDevice;
  private interface: DFUInterface;
  private interfaceNumber: number;
  public transferSize: number = 4096;
  public startAddress: number = 0x90040000; // Default for Daisy

  // Logging callbacks
  public logProgress?: (done: number, total: number) => void;
  public logInfo?: (msg: string) => void;
  public logWarning?: (msg: string) => void;
  public logError?: (msg: string) => void;

  constructor(device: USBDevice, dfu_interface: DFUInterface) {
    this.device = device;
    this.interface = dfu_interface;
    this.interfaceNumber = dfu_interface.interface.interfaceNumber;
  }

  async open(): Promise<void> {
    await this.device.open();
    const confValue = this.interface.configuration.configurationValue;
    if (this.device.configuration?.configurationValue !== confValue) {
      await this.device.selectConfiguration(confValue);
    }
    await this.device.claimInterface(this.interfaceNumber);
    
    const altSetting = this.interface.alternate.alternateSetting;
    await this.device.selectAlternateInterface(this.interfaceNumber, altSetting);
    
    // Get the transfer size from the DFU functional descriptor
    // For Daisy, it's typically 4096 as shown in dfu-util output
    this.transferSize = 4096;
  }

  async close(): Promise<void> {
    try {
      await this.device.close();
    } catch (error) {
      console.warn('Device close error:', error);
    }
  }

  private async controlTransfer(
    direction: 'in' | 'out',
    request: number,
    value: number = 0,
    length: number = 6,
    data?: BufferSource
  ): Promise<ArrayBuffer | undefined> {
    const setup: USBControlTransferParameters = {
      requestType: 'class',
      recipient: 'interface',
      request: request,
      value: value,
      index: this.interfaceNumber
    };

    if (direction === 'out' && data) {
      await this.device.controlTransferOut(setup, data);
      return undefined;
    } else {
      const result = await this.device.controlTransferIn(setup, length);
      return result.data?.buffer;
    }
  }

  async getStatus(): Promise<{ status: number; state: number; pollTimeout: number }> {
    const data = await this.controlTransfer('in', DFU.GETSTATUS, 0, 6);
    if (!data || data.byteLength < 6) {
      throw new Error('Invalid DFU status response');
    }

    const view = new DataView(data);
    return {
      status: view.getUint8(0),
      pollTimeout: view.getUint8(1) | (view.getUint8(2) << 8) | (view.getUint8(3) << 16),
      state: view.getUint8(4)
    };
  }

  async clearStatus(): Promise<void> {
    await this.controlTransfer('out', DFU.CLRSTATUS);
  }

  async getState(): Promise<number> {
    const data = await this.controlTransfer('in', DFU.GETSTATE, 0, 1);
    if (!data || data.byteLength < 1) {
      throw new Error('Invalid DFU state response');
    }
    return new DataView(data).getUint8(0);
  }

  async abort(): Promise<void> {
    await this.controlTransfer('out', DFU.ABORT);
  }

  private async dfuseCommand(command: number, address: number): Promise<void> {
    const data = new ArrayBuffer(5);
    const view = new DataView(data);
    view.setUint8(0, command);
    view.setUint32(1, address, true); // Little endian
    await this.controlTransfer('out', DFU.DNLOAD, 0, 6, data);

    // Wait for command to complete
    let status;
    do {
      await new Promise(resolve => setTimeout(resolve, 50));
      status = await this.getStatus();
      this.logInfo?.(`DfuSe command status: ${status.status}, state: ${status.state}`);
    } while (status.state === DFU_STATE.dfuDNBUSY || status.state === DFU_STATE.dfuDNLOAD_SYNC);
    
    if (status.status !== DFU_STATUS.OK) {
      throw new Error(`DfuSe command failed with status ${status.status}`);
    }
  }

  async download(data: Uint8Array): Promise<void> {
    this.logInfo?.('Starting DfuSe download...');
    
    try {
      // Clear any error status first
      const initialStatus = await this.getStatus();
      this.logInfo?.(`Initial status: ${initialStatus.status}, state: ${initialStatus.state}`);
      
      if (initialStatus.state === DFU_STATE.dfuERROR) {
        this.logInfo?.('Clearing error status...');
        await this.clearStatus();
      }
      
      // For DfuSe devices, we might need to erase first
      // Some devices auto-erase, but let's be explicit
      this.logInfo?.(`Erasing memory at 0x${this.startAddress.toString(16)}...`);
      
      // Mass erase command (0x41 without address means mass erase)
      const eraseData = new ArrayBuffer(1);
      new DataView(eraseData).setUint8(0, DFUSE_ERASE);
      await this.controlTransfer('out', DFU.DNLOAD, 0, 6, eraseData);
      
      // Wait for erase to complete
      let eraseStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 100));
        eraseStatus = await this.getStatus();
        this.logInfo?.(`Erase status: ${eraseStatus.status}, state: ${eraseStatus.state}`);
      } while (eraseStatus.state === DFU_STATE.dfuDNBUSY || eraseStatus.state === DFU_STATE.dfuDNLOAD_SYNC);
      
      // Set start address
      this.logInfo?.(`Setting address to 0x${this.startAddress.toString(16)}`);
      await this.dfuseCommand(DFUSE_SET_ADDRESS, this.startAddress);

      // Download firmware in chunks
      const chunkSize = this.transferSize;
      const totalSize = data.length;
      let offset = 0;
      let blockNum = 2; // Start at 2 after SET_ADDRESS command

      this.logInfo?.(`Downloading ${totalSize} bytes in ${chunkSize} byte chunks...`);

      while (offset < totalSize) {
      const size = Math.min(chunkSize, totalSize - offset);
      const chunk = data.slice(offset, offset + size);
      
      // Download chunk
      await this.controlTransfer('out', DFU.DNLOAD, blockNum, 6, chunk);
      
      // Wait for transfer to complete
      let status: { status: number; state: number; pollTimeout: number };
      let pollCount = 0;
      do {
        await new Promise(resolve => setTimeout(resolve, status?.pollTimeout || 50));
        status = await this.getStatus();
        pollCount++;
        
        if (pollCount > 1000) {
          throw new Error('Timeout waiting for download to complete');
        }
        
        if (status.status !== DFU_STATUS.OK) {
          throw new Error(`DFU error: status ${status.status}`);
        }
      } while (status.state === DFU_STATE.dfuDNLOAD_SYNC || status.state === DFU_STATE.dfuDNBUSY);

      offset += size;
      blockNum += 1;
      
      // Report progress
      this.logProgress?.(offset, totalSize);
    }

      // Send empty transfer to end
      this.logInfo?.('Finalizing download...');
      await this.controlTransfer('out', DFU.DNLOAD, 0, 6, new ArrayBuffer(0));
      
      // Wait for manifestation
      let finalStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 100));
        finalStatus = await this.getStatus();
        this.logInfo?.(`Final status: ${finalStatus.status}, state: ${finalStatus.state}`);
      } while (finalStatus.state === DFU_STATE.dfuMANIFEST_SYNC || 
               finalStatus.state === DFU_STATE.dfuMANIFEST);

      this.logInfo?.('Download complete!');
    } catch (error) {
      this.logError?.(`Download failed: ${error}`);
      throw error;
    }
  }
}

export function findDfuInterfaces(device: USBDevice): DFUInterface[] {
  const interfaces: DFUInterface[] = [];
  
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 0xFE && 
            alt.interfaceSubclass === 0x01 &&
            (alt.interfaceProtocol === 0x01 || alt.interfaceProtocol === 0x02)) {
          interfaces.push({
            configuration: config,
            interface: iface,
            alternate: alt,
            name: alt.interfaceName || null
          });
        }
      }
    }
  }
  
  return interfaces;
}