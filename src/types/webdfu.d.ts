declare module 'webdfu' {
  export interface DFUDescriptor {
    wTransferSize?: number;
    bcdDFUVersion?: number;
    bmAttributes?: number;
    wDetachTimeOut?: number;
    bDescriptorType?: number;
  }

  export interface DFUStatus {
    state: number;
    status: number;
    pollTimeout: number;
  }

  export interface DFUInterface {
    configuration: any;
    interface: any;
    alternate: any;
    name?: string;
  }

  export class DFUDevice {
    constructor(device: USBDevice, settings: DFUInterface);
    open(): Promise<void>;
    close(): Promise<void>;
    readConfigurationDescriptor(index: number): Promise<DataView>;
    clearStatus(): Promise<void>;
    getStatus(): Promise<DFUStatus>;
    getState(): Promise<number>;
    download(data: Uint8Array, blockNum: number): Promise<number>;
    do_download(transferSize: number, data: Uint8Array, manifestationTolerant: boolean): Promise<void>;
    abort(): Promise<void>;
    abortToIdle(): Promise<void>;
    poll_until_idle(idleState: number): Promise<DFUStatus>;
    poll_until(predicate: (state: number) => boolean): Promise<DFUStatus>;
  }

  export class DFUClass {
    static findDeviceDfuInterfaces(device: USBDevice): DFUInterface[];
    static parseConfigurationDescriptor(data: DataView): any;
    static Device: typeof DFUDevice;

    static get dfuIDLE(): number;
    static get dfuERROR(): number;
    static get dfuDNLOAD_IDLE(): number;
    static get dfuDNBUSY(): number;
    static get dfuMANIFEST_SYNC(): number;
    static get STATUS_OK(): number;
  }

  export const DFU: DFUClass;
  export const DFUse: any;
}