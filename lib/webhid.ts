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
  private demoState: {
    keymap: Uint16Array;
    macros: Uint8Array;
    lighting: {
      backlightBrightness: number;
      backlightEffect: number;
      rgbBrightness: number;
      rgbEffect: number;
      rgbSpeed: number;
      rgbColor: { h: number; s: number };
    };
  } | null = null;

  get connectedDevice(): HIDDevice | null {
    return this.device;
  }

  enableDemoMode(): Promise<HIDDevice> {
    this.demoMode = true;
    return this.createDemoDevice();
  }

  private async createDemoDevice(): Promise<HIDDevice> {
    if (!this.demoState) {
      this.initDemoState();
    }
    
    // Create a dummy HIDDevice
    const demoDevice: HIDDevice = {
      opened: true,
      vendorId: 0x3434, // Keychron
      productId: 0x0350, // V5
      productName: 'Keychron V5 (Demo)',
      collections: [],
      open: async () => {},
      close: async () => {},
      sendReport: async (id, data) => {},
      sendFeatureReport: async () => {},
      receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    
    this.device = demoDevice;
    return demoDevice;
  }

  private initDemoState() {
    const layers = 4;
    const rows = 6;
    const cols = 18;
    
    // Initialize keymap with zeros
    const keymap = new Uint16Array(layers * rows * cols);
    
    // Helper to set key at row,col
    const setKey = (l: number, r: number, c: number, code: number) => {
      if (l < layers && r < rows && c < cols) {
        keymap[l * rows * cols + r * cols + c] = code;
      }
    };

    // Layer 0 - Keychron V5 ANSI Default
    
    // Row 0
    setKey(0, 0, 0, 0x0029); // ESC
    setKey(0, 0, 1, 0x003A); // F1
    setKey(0, 0, 2, 0x003B); // F2
    setKey(0, 0, 3, 0x7E40); // F3 (Mission Control)
    setKey(0, 0, 4, 0x7E41); // F4 (Launch Pad)
    for(let i=5; i<=12; i++) setKey(0, 0, i, 0x003A + i - 1); // F5-F12
    setKey(0, 0, 13, 0x004C); // DEL
    setKey(0, 0, 14, 0x004A); // HOME
    setKey(0, 0, 15, 0x004B); // PGUP
    setKey(0, 0, 16, 0x004E); // PGDN
    setKey(0, 0, 17, 0x004D); // END
    setKey(0, 3, 12, 0x007F); // KNOB (MUTE)

    // Row 1
    setKey(0, 1, 0, 0x0035); // `~
    for(let i=1; i<=9; i++) setKey(0, 1, i, 0x001E + i - 1); // 1-9
    setKey(0, 1, 10, 0x0027); // 0
    setKey(0, 1, 11, 0x002D); // -
    setKey(0, 1, 12, 0x002E); // =
    setKey(0, 1, 13, 0x002A); // BACKSPACE
    setKey(0, 1, 15, 0x0053); // NUMLOCK
    setKey(0, 1, 16, 0x0054); // KP_/
    setKey(0, 1, 17, 0x0055); // KP_*
    setKey(0, 3, 14, 0x0056); // KP_-

    // Row 2
    setKey(0, 2, 0, 0x002B); // TAB
    const row2q = [0x0014, 0x001A, 0x0008, 0x0015, 0x0017, 0x001C, 0x0018, 0x000C, 0x0012, 0x0013]; // Q-P
    row2q.forEach((k, i) => setKey(0, 2, i+1, k));
    setKey(0, 2, 11, 0x002F); // [
    setKey(0, 2, 12, 0x0030); // ]
    setKey(0, 2, 13, 0x0031); // \
    setKey(0, 2, 15, 0x005F); // KP_7
    setKey(0, 2, 16, 0x0060); // KP_8
    setKey(0, 2, 17, 0x0061); // KP_9
    setKey(0, 2, 14, 0x0057); // KP_+

    // Row 3
    setKey(0, 3, 0, 0x0039); // CAPS
    const row3a = [0x0004, 0x0016, 0x0007, 0x0009, 0x000A, 0x000B, 0x000D, 0x000E, 0x000F]; // A-L
    row3a.forEach((k, i) => setKey(0, 3, i+1, k));
    setKey(0, 3, 10, 0x0033); // ;
    setKey(0, 3, 11, 0x0034); // '
    setKey(0, 3, 13, 0x0028); // ENTER
    setKey(0, 3, 15, 0x005C); // KP_4
    setKey(0, 3, 16, 0x005D); // KP_5
    setKey(0, 3, 17, 0x005E); // KP_6

    // Row 4
    setKey(0, 4, 0, 0x00E1); // LSHIFT
    const row4z = [0x001D, 0x001B, 0x0006, 0x0019, 0x0005, 0x0011, 0x0010]; // Z-M
    row4z.forEach((k, i) => setKey(0, 4, i+2, k));
    setKey(0, 4, 9, 0x0036); // ,
    setKey(0, 4, 10, 0x0037); // .
    setKey(0, 4, 11, 0x0038); // /
    setKey(0, 4, 13, 0x00E5); // RSHIFT
    setKey(0, 4, 14, 0x0052); // UP
    setKey(0, 4, 15, 0x0059); // KP_1
    setKey(0, 4, 16, 0x005A); // KP_2
    setKey(0, 4, 17, 0x005B); // KP_3
    setKey(0, 5, 5, 0x0058); // KP_ENTER

    // Row 5
    setKey(0, 5, 0, 0x00E0); // LCTRL
    setKey(0, 5, 1, 0x00E2); // LALT (Option)
    setKey(0, 5, 2, 0x00E3); // LGUI (Command)
    setKey(0, 5, 6, 0x002C); // SPACE
    setKey(0, 5, 10, 0x00E7); // RGUI (Command)
    setKey(0, 5, 11, 0x5201); // FN (MO(1))
    setKey(0, 5, 12, 0x00E4); // RCTRL
    setKey(0, 5, 13, 0x0050); // LEFT
    setKey(0, 5, 14, 0x0051); // DOWN
    setKey(0, 5, 15, 0x004F); // RIGHT
    setKey(0, 5, 16, 0x0062); // KP_0
    setKey(0, 5, 17, 0x0063); // KP_DOT


    this.demoState = {
      keymap,
      macros: new Uint8Array(1024), // 1KB macro buffer
      lighting: {
        backlightBrightness: 128,
        backlightEffect: 1,
        rgbBrightness: 128,
        rgbEffect: 3,
        rgbSpeed: 128,
        rgbColor: { h: 0, s: 255 }
      }
    };
  }

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
      if (!d) return null;
      await this.open(d);
      return d;
    } catch (err) {
      console.error('Request device failed:', err);
      return null;
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
        // console.error('WebHID handler error', err);
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
      // console.error('Failed to parse input report', err);
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
            // console.error('request handler error', err);
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
          // console.error('event handler error', err);
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

  async sendRaw(reportId: number, data: Uint8Array): Promise<void> {
    if (!this.device) throw new Error('No device connected');
    if (this.demoMode) {
      // Simulate raw response for VIA commands if needed?
      // For now just ignore in demo mode or maybe log
      console.log('Demo sendRaw', reportId, data);
      return;
    }
    await this.device.sendReport(reportId, data as unknown as BufferSource);
  }

  private nextSeq() {
    this.seq = (this.seq + 1) & 0xff;
    if (this.seq === 0) this.seq = 1;
    return this.seq;
  }

  private simulateQmkResponse(payload: Uint8Array): Uint8Array {
    if (payload.length === 0) return new Uint8Array(0);
    const cmd = payload[0];

    // Ensure demo state is initialized
    if (!this.demoState) {
      this.initDemoState();
    }
    
    // Non-null assertion is safe here because initDemoState() ensures it
    const state = this.demoState!;
    const keymap = state.keymap;
    const macros = state.macros;
    
    const ROWS = 6;
    const COLS = 18;

    switch (cmd) {
      // VIA Commands
      case 0x01: // GET_PROTOCOL_VERSION
        // Version 9 (0x0009)
        return new Uint8Array([0x01, 0x00, 0x09]);
        
      case 0x04: // DYNAMIC_KEYMAP_GET_KEYCODE
        // payload: [cmd, layer, row, col]
        if (payload.length >= 4) {
          const layer = payload[1];
          const row = payload[2];
          const col = payload[3];
          const idx = (layer * ROWS * COLS) + (row * COLS) + col;
          if (idx < keymap.length) {
            const code = keymap[idx];
            return new Uint8Array([0x04, (code >> 8) & 0xff, code & 0xff]);
          }
        }
        return new Uint8Array([0x04, 0x00, 0x00]);

      case 0x05: // DYNAMIC_KEYMAP_SET_KEYCODE
        // payload: [cmd, layer, row, col, val_high, val_low]
        if (payload.length >= 6) {
          const layer = payload[1];
          const row = payload[2];
          const col = payload[3];
          const code = (payload[4] << 8) | payload[5];
          const idx = (layer * ROWS * COLS) + (row * COLS) + col;
          if (idx < keymap.length) {
            keymap[idx] = code;
          }
        }
        return payload; // Echo back

      case 0x11: // DYNAMIC_KEYMAP_GET_LAYER_COUNT
        return new Uint8Array([0x11, 0x04]);

      case 0x12: // DYNAMIC_KEYMAP_GET_BUFFER
        // payload: [cmd, offset_high, offset_low, size]
        if (payload.length >= 4) {
          const offset = (payload[1] << 8) | payload[2];
          const size = payload[3];
          const buffer = new Uint8Array(keymap.buffer);
          const chunk = new Uint8Array(size + 1);
          chunk[0] = 0x12; // Response ID
          if (offset < buffer.length) {
            const actualSize = Math.min(size, buffer.length - offset);
            chunk.set(buffer.slice(offset, offset + actualSize), 1);
          }
          return chunk;
        }
        return new Uint8Array([0x12]);

      case 0x0C: // DYNAMIC_KEYMAP_MACRO_GET_COUNT
        return new Uint8Array([0x0C, 16]);

      case 0x0D: // DYNAMIC_KEYMAP_MACRO_GET_BUFFER_SIZE
        {
          const size = macros.length;
          return new Uint8Array([0x0D, (size >> 8) & 0xff, size & 0xff]);
        }

      case 0x0E: // DYNAMIC_KEYMAP_MACRO_GET_BUFFER
        if (payload.length >= 4) {
          const offset = (payload[1] << 8) | payload[2];
          const size = payload[3];
          const chunk = new Uint8Array(size + 1);
          chunk[0] = 0x0E;
          if (offset < macros.length) {
            const actualSize = Math.min(size, macros.length - offset);
            chunk.set(macros.slice(offset, offset + actualSize), 1);
          }
          return chunk;
        }
        return new Uint8Array([0x0E]);

      case 0x0F: // DYNAMIC_KEYMAP_MACRO_SET_BUFFER
        // payload: [cmd, offset_high, offset_low, size, ...data]
        if (payload.length >= 4) {
          const offset = (payload[1] << 8) | payload[2];
          const size = payload[3];
          const data = payload.slice(4, 4 + size);
          if (offset < macros.length) {
            const actualSize = Math.min(size, macros.length - offset);
            macros.set(data.slice(0, actualSize), offset);
          }
        }
        return new Uint8Array([0x0F]);
        
      case 0x07: // LIGHTING_GET_VALUE
        // payload: [cmd, prop_id, effect_id(optional)]
        if (payload.length >= 2) {
          const propId = payload[1];
          // QMK Lighting IDs
          // 0x01: Backlight Brightness
          // 0x02: Backlight Effect
          // 0x03: RGB Brightness
          // 0x04: RGB Effect
          // 0x05: RGB Effect Speed
          // 0x06: RGB Color
          
          let val1 = 0;
          let val2 = 0;

          switch (propId) {
            case 0x01: val1 = state.lighting.backlightBrightness; break;
            case 0x02: val1 = state.lighting.backlightEffect; break;
            case 0x03: val1 = state.lighting.rgbBrightness; break;
            case 0x04: val1 = state.lighting.rgbEffect; break;
            case 0x05: val1 = state.lighting.rgbSpeed; break;
            case 0x06: val1 = state.lighting.rgbColor.h; val2 = state.lighting.rgbColor.s; break;
          }
          return new Uint8Array([0x07, val1, val2]);
        }
        return new Uint8Array([0x07, 0, 0]);

      case 0x08: // LIGHTING_SET_VALUE
        // payload: [cmd, prop_id, val1, val2]
        if (payload.length >= 3) {
          const propId = payload[1];
          const val1 = payload[2];
          const val2 = payload.length >= 4 ? payload[3] : 0;
          
          switch (propId) {
            case 0x01: state.lighting.backlightBrightness = val1; break;
            case 0x02: state.lighting.backlightEffect = val1; break;
            case 0x03: state.lighting.rgbBrightness = val1; break;
            case 0x04: state.lighting.rgbEffect = val1; break;
            case 0x05: state.lighting.rgbSpeed = val1; break;
            case 0x06: state.lighting.rgbColor = { h: val1, s: val2 }; break;
          }
        }
        return payload; // Echo back

      // Legacy/Custom QMK commands (keep for backward compatibility if needed)
      case 0x02: // GET_VERSION
        return new TextEncoder().encode('Demo VIA/QMK 1.0');

      default:
        return new Uint8Array(0);
    }
  }
}

const webhid = new WebHIDManager();
export default webhid;
