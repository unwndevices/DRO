declare module 'dfu' {
  export interface DFUInterface {
    name: string;
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternateIndex: number;
  }

  export interface DFUProperties {
    TransferSize: number;
    DetachTimeout?: number;
    DFUVersion?: number;
  }

  export class Device {
    device: USBDevice;
    interface: DFUInterface;
    properties: DFUProperties;
    logProgress?: (done: number, total: number) => void;
    logInfo?: (message: string) => void;
    logWarning?: (message: string) => void;
    logError?: (message: string) => void;

    constructor(device: USBDevice, interface: DFUInterface);
    
    open(): Promise<void>;
    close(): Promise<void>;
    getState(): Promise<number>;
    clearStatus(): Promise<void>;
    do_download(transferSize: number, data: ArrayBuffer, manifestation?: boolean): Promise<void>;
    do_upload(transferSize: number, maxSize?: number): Promise<ArrayBuffer>;
  }

  export function findDeviceDfuInterfaces(device: USBDevice): DFUInterface[];
  
  export const DFUse: {
    SET_ADDRESS: number;
    ERASE_SECTOR: number;
  };
}