// WebHID type definitions (may not be available in all environments)
declare global {
  interface HIDInputReportEvent extends Event {
    readonly reportId: number;
    readonly data: DataView;
  }

  interface HIDDeviceFilter {
    vendorId?: number;
    productId?: number;
    usagePage?: number;
    usage?: number;
  }

  interface HIDDevice {
    readonly opened: boolean;
    readonly vendorId: number | null;
    readonly productId: number | null;
    readonly productName: string | null;
    readonly collections: readonly HIDCollectionInfo[];
    open(): Promise<void>;
    close(): Promise<void>;
    sendReport(reportId: number, data: BufferSource): Promise<void>;
    sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
    receiveFeatureReport(reportId: number): Promise<DataView>;
    addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
    removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
  }

  interface HIDCollectionInfo {
    readonly usagePage: number;
    readonly usage: number;
    readonly type: number;
    readonly children: readonly HIDCollectionInfo[];
    readonly inputReports: readonly HIDReportInfo[];
    readonly outputReports: readonly HIDReportInfo[];
    readonly featureReports: readonly HIDReportInfo[];
  }

  interface HIDReportInfo {
    readonly reportId: number;
    readonly items: readonly HIDReportItem[];
  }

  interface HIDReportItem {
    readonly isAbsolute: boolean;
    readonly isArray: boolean;
    readonly isBufferedBytes: boolean;
    readonly isConstant: boolean;
    readonly isLinear: boolean;
    readonly isRange: boolean;
    readonly isVolatile: boolean;
    readonly hasNull: boolean;
    readonly hasPreferredState: boolean;
    readonly wrap: boolean;
    readonly usages: readonly number[];
    readonly usageMinimum: number;
    readonly usageMaximum: number;
    readonly reportSize: number;
    readonly reportCount: number;
    readonly unitExponent: number;
    readonly unit: number;
    readonly logicalMinimum: number;
    readonly logicalMaximum: number;
    readonly physicalMinimum: number;
    readonly physicalMaximum: number;
  }

  interface Navigator {
    hid: {
      getDevices(): Promise<HIDDevice[]>;
      requestDevice(options?: { filters?: HIDDeviceFilter[] }): Promise<HIDDevice[]>;
    };
  }
}

export type InputReportHandler = (event: HIDInputReportEvent) => void;

export class WebHIDManager {
  private device: HIDDevice | null = null;
  private handlers = new Set<InputReportHandler>();
  private eventHandlers = new Set<(reportId: number, payload: Uint8Array) => void>();
  private requestHandlers = new Set<(reportId: number, payload: Uint8Array) => Promise<Uint8Array | void> | Uint8Array | void>();
  private seq = 1;
  private pending = new Map<number, { resolve: (v: Uint8Array) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  private reassembly = new Map<number, { total: number; buf: Uint8Array; received: number; type: number }>();
  private defaultChunkSize = 64;
  private demoMode = false;

  /**
   * Set the maximum HID report/chunk size used for fragmentation.
   * Must be >= 16 (safe minimum). Default is 64.
   */
  setChunkSize(size: number) {
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 16) {
      throw new Error('chunk size must be a finite number >= 16');
    }
    this.defaultChunkSize = Math.floor(size);
  }

  /**
   * Get the current chunk/report size used for fragmentation.
   */
  getChunkSize(): number {
    return this.defaultChunkSize;
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  async getDevices(): Promise<HIDDevice[]> {
    if (!this.isSupported()) return [];
    return await navigator.hid.getDevices();
  }

  async requestDevice(filters?: HIDDeviceFilter[]): Promise<HIDDevice | null> {
    if (!this.isSupported()) throw new Error('WebHID not supported');

    const devices = await navigator.hid.requestDevice({ filters: filters ?? [] });
    if (devices.length === 0) return null;
    return devices[0];
  }

  async requestAndOpen(filters?: HIDDeviceFilter[]): Promise<HIDDevice | null> {
    try {
      const d = await this.requestDevice(filters);
      if (!d) {
        // Enable demo mode if no device found
        this.demoMode = true;
        return this.createDemoDevice();
      }
      await this.open(d);
      return d;
    } catch (err) {
      // If request fails (e.g., user cancels), enable demo mode
      this.demoMode = true;
      return this.createDemoDevice();
    }
  }

  async open(device: HIDDevice): Promise<void> {
    if (!this.isSupported()) throw new Error('WebHID not supported');
    if (!device.opened) await device.open();
    this.device = device;
    device.addEventListener('inputreport', this.handleInputReport);
  }

  async close(): Promise<void> {
    if (!this.device) return;
    try {
      this.device.removeEventListener('inputreport', this.handleInputReport);
      if (this.device.opened) await this.device.close();
    } finally {
      this.device = null;
    }
  }

  sendReport(reportId: number, data: Uint8Array): Promise<void> {
    if (!this.device) return Promise.reject(new Error('No device connected'));
    return this.device.sendReport(reportId, data.buffer as ArrayBuffer);
  }

  /**
   * Send a request and wait for a response. Framing: [seq(1), type(1)=1(response)|0(request)|2(event), ...payload]
   */
  async sendRequest(reportId: number, payload: Uint8Array, timeout = 5000): Promise<Uint8Array> {
    if (!this.device) return Promise.reject(new Error('No device connected'));

    if (this.demoMode) {
      // Simulate response for demo mode
      return this.simulateQmkResponse(payload);
    }

    const id = this.nextSeq();
    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Request timed out'));
      }, timeout);

      this.pending.set(id, { resolve, reject, timer });
      this.sendFragmented(reportId, id, 0, payload).catch((err) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      });
    });
  }

  /**
   * Send an event/notification (no response expected)
   */
  async sendEvent(reportId: number, payload: Uint8Array): Promise<void> {
    if (!this.device) return Promise.reject(new Error('No device connected'));
    const id = this.nextSeq();
    return this.sendFragmented(reportId, id, 2, payload);
  }

  onEvent(handler: (reportId: number, payload: Uint8Array) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onRequest(handler: (reportId: number, payload: Uint8Array) => Promise<Uint8Array | void> | Uint8Array | void): () => void {
    this.requestHandlers.add(handler);
    return () => this.requestHandlers.delete(handler);
  }

  onInputReport(handler: InputReportHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private handleInputReport = (event: Event) => {
    // event is actually HIDInputReportEvent
    const e = event as HIDInputReportEvent;
    // call raw handlers
    for (const h of Array.from(this.handlers)) {
      try {
        h(e);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('WebHID handler error', err);
      }
    }

    try {
      const data = new Uint8Array(e.data.buffer);
      if (data.length < 2) return;
      const id = data[0];
      const flags = data[1];
      const isStart = (flags & 0x80) !== 0;
      const typ = flags & 0x7f; // 0=request,1=response,2=event,3=cont(not used for start)

      if (isStart) {
        if (data.length < 4) return; // need total length bytes
        const total = data[2] | (data[3] << 8);
        const firstPayload = data.slice(4);
        const buf = new Uint8Array(total);
        buf.set(firstPayload, 0);
        const received = firstPayload.length;
        if (received >= total) {
          // complete in one chunk
          this.handleFullMessage(e.reportId, id, typ, buf);
        } else {
          this.reassembly.set(id, { total, buf, received, type: typ });
        }
        return;
      }

      // continuation chunk
      const payload = data.slice(2);
      const existing = this.reassembly.get(id);
      if (!existing) {
        // stray continuation: ignore
        return;
      }
      existing.buf.set(payload, existing.received);
      existing.received += payload.length;
      if (existing.received >= existing.total) {
        this.reassembly.delete(id);
        this.handleFullMessage(e.reportId, id, existing.type, existing.buf);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse input report', err);
    }
  };

  private handleFullMessage(reportId: number, id: number, typ: number, payload: Uint8Array) {
    // 1 = response
    if (typ === 1) {
      const p = this.pending.get(id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(id);
        p.resolve(payload);
      }
      return;
    }

    // 0 = request: dispatch to request handlers and optionally send back response
    if (typ === 0) {
      (async () => {
        for (const h of Array.from(this.requestHandlers)) {
          try {
            const r = await h(reportId, payload);
            if (r instanceof Uint8Array && this.device) {
              await this.sendFragmented(reportId, id, 1, r);
            }
          } catch (err) {
            // handler error; ignore so other handlers still run
            // eslint-disable-next-line no-console
            console.error('request handler error', err);
          }
        }
      })();
      return;
    }

    // 2 = event/notification
    if (typ === 2) {
      for (const h of Array.from(this.eventHandlers)) {
        try {
          h(reportId, payload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('event handler error', err);
        }
      }
    }
  }

  private async sendFragmented(reportId: number, id: number, typ: number, payload: Uint8Array, maxChunkSize?: number): Promise<void> {
    if (!this.device) return Promise.reject(new Error('No device connected'));

    if (this.demoMode) {
      // In demo mode, don't send anything
      return;
    }

    const chunk = maxChunkSize ?? this.defaultChunkSize;
    const startHeader = 4; // id(1) + flags(1) + totalLen(2)
    const contHeader = 2; // id(1) + flags(1)

    const firstMax = chunk - startHeader;
    const contMax = chunk - contHeader;

    const total = payload.length;
    let offset = 0;

    // send start chunk
    const flags = 0x80 | (typ & 0x7f); // START bit + typ
    const firstLen = Math.min(firstMax, total - offset);
    const firstBuf = new Uint8Array(4 + firstLen);
    firstBuf[0] = id;
    firstBuf[1] = flags;
    firstBuf[2] = total & 0xff;
    firstBuf[3] = (total >> 8) & 0xff;
    firstBuf.set(payload.slice(offset, offset + firstLen), 4);
    await this.device.sendReport(reportId, firstBuf);
    offset += firstLen;

    while (offset < total) {
      const thisLen = Math.min(contMax, total - offset);
      const buf = new Uint8Array(2 + thisLen);
      buf[0] = id;
      buf[1] = 0x03; // continuation type code
      buf.set(payload.slice(offset, offset + thisLen), 2);
      await this.device.sendReport(reportId, buf);
      offset += thisLen;
    }
  }

  private nextSeq() {
    this.seq = (this.seq + 1) & 0xff;
    if (this.seq === 0) this.seq = 1;
    return this.seq;
  }

  private simulateQmkResponse(payload: Uint8Array): Uint8Array {
    if (payload.length === 0) return new Uint8Array(0);
    const cmd = payload[0];
    switch (cmd) {
      case 0x01: // PING
        return new TextEncoder().encode('pong');
      case 0x02: // GET_VERSION
        return new TextEncoder().encode('Demo QMK 1.0');
      case 0x03: // RESET_TO_BOOTLOADER
        return new Uint8Array(0); // No response needed
      case 0x10: // EEPROM_READ
        // Return some dummy EEPROM data
        return new Uint8Array(32).fill(0xFF);
      case 0x11: // EEPROM_WRITE
        return new Uint8Array(0); // Success
      case 0x20: // KEYMAP_GET
        // Return the test keymap as JSON
        const testKeymap = [
          ["KC_ESC", "KC_1", "KC_2", "KC_3", "KC_4", "KC_5", "KC_6", "KC_7", "KC_8", "KC_9", "KC_0", "KC_MINS", "KC_EQL", "KC_BSPC"],
          ["KC_TAB", "KC_Q", "KC_W", "KC_E", "KC_R", "KC_T", "KC_Y", "KC_U", "KC_I", "KC_O", "KC_P", "KC_LBRC", "KC_RBRC", "KC_BSLS"],
          ["KC_CAPS", "KC_A", "KC_S", "KC_D", "KC_F", "KC_G", "KC_H", "KC_J", "KC_K", "KC_L", "KC_SCLN", "KC_QUOT", "", "KC_ENT"],
          ["KC_LSFT", "", "KC_Z", "KC_X", "KC_C", "KC_V", "KC_B", "KC_N", "KC_M", "KC_COMM", "KC_DOT", "KC_SLSH", "", "KC_RSFT"],
          ["KC_LCTL", "KC_LGUI", "KC_LALT", "", "", "", "KC_SPC", "", "", "", "KC_RALT", "KC_RGUI", "KC_APP", "KC_RCTL"]
        ];
        return new TextEncoder().encode(JSON.stringify(testKeymap));
      case 0x21: // KEYMAP_SET
        return new Uint8Array(0); // Success
      default:
        return new Uint8Array(0);
    }
  }

  private createDemoDevice(): HIDDevice {
    return {
      opened: true,
      vendorId: 0x3434,
      productId: 0x0350,
      productName: 'Demo Keychron V5 ANSI',
      collections: [],
      open: async () => {},
      close: async () => {},
      sendReport: async () => {},
      sendFeatureReport: async () => {},
      receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
}

const webhid = new WebHIDManager();
export default webhid;
