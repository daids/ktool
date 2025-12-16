import webhid from './webhid';

// VIA Command IDs
export enum ViaCommand {
  GET_PROTOCOL_VERSION = 0x01,
  GET_KEYBOARD_VALUE = 0x02,
  SET_KEYBOARD_VALUE = 0x03,
  DYNAMIC_KEYMAP_GET_KEYCODE = 0x04,
  DYNAMIC_KEYMAP_SET_KEYCODE = 0x05,
  DYNAMIC_KEYMAP_RESET = 0x06,
  LIGHTING_GET_VALUE = 0x07,
  LIGHTING_SET_VALUE = 0x08,
  DYNAMIC_KEYMAP_MACRO_GET_COUNT = 0x0C,
  DYNAMIC_KEYMAP_MACRO_GET_BUFFER_SIZE = 0x0D,
  DYNAMIC_KEYMAP_MACRO_GET_BUFFER = 0x0E,
  DYNAMIC_KEYMAP_MACRO_SET_BUFFER = 0x0F,
  DYNAMIC_KEYMAP_MACRO_RESET = 0x10,
  DYNAMIC_KEYMAP_GET_LAYER_COUNT = 0x11,
  DYNAMIC_KEYMAP_GET_BUFFER = 0x12,
  DYNAMIC_KEYMAP_SET_BUFFER = 0x13,
}

// Lighting Value IDs
export enum LightingValue {
  BACKLIGHT_BRIGHTNESS = 0x09,
  BACKLIGHT_EFFECT = 0x0A,
  RGBLIGHT_BRIGHTNESS = 0x80,
  RGBLIGHT_EFFECT = 0x81,
  RGBLIGHT_EFFECT_SPEED = 0x82,
  RGBLIGHT_COLOR = 0x83,
}

async function sendViaCommand(cmd: number, payload?: Uint8Array, timeout = 1000): Promise<Uint8Array> {
  if (!webhid.isSupported()) throw new Error('WebHID not supported');
  const body = new Uint8Array((payload?.length ?? 0) + 1);
  body[0] = cmd & 0xff;
  if (payload) body.set(payload, 1);
  
  // Send command to interface 1 (typically raw HID)
  // Note: webhid.sendRequest might need adjustment if it doesn't handle raw command structure expected by VIA
  // VIA expects [cmd, ...args] in the report body. 
  // reportId is usually 0 for VIA if not using tagged reports, but some implementations use report ID.
  // We'll assume report ID 0 for now as implemented in webhid.ts
  
  const resp = await webhid.sendRequest(0, body, timeout);
  return resp;
}

export async function getProtocolVersion(): Promise<number> {
  const r = await sendViaCommand(ViaCommand.GET_PROTOCOL_VERSION);
  // Response: [0x01, high_byte, low_byte]
  if (r.length >= 3) {
    return (r[1] << 8) | r[2];
  }
  return 0;
}

export async function getLayerCount(): Promise<number> {
  const r = await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_GET_LAYER_COUNT);
  if (r.length >= 2) {
    return r[1];
  }
  return 4; // default fallback
}

export async function getKeycode(layer: number, row: number, col: number): Promise<number> {
  const payload = new Uint8Array([layer, row, col]);
  const r = await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_GET_KEYCODE, payload);
  // Response: [0x04, keycode_high, keycode_low]
  if (r.length >= 3) {
    return (r[1] << 8) | r[2];
  }
  return 0;
}

export async function setKeycode(layer: number, row: number, col: number, keycode: number): Promise<void> {
  const payload = new Uint8Array([layer, row, col, (keycode >> 8) & 0xff, keycode & 0xff]);
  await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_SET_KEYCODE, payload);
}

// Helper to load full keymap (slowly, cell by cell, or using buffer if implemented)
// For compatibility, we'll implement a buffer fetch if possible, or iterative.
// The previous custom getKeymap fetched a JSON or Hex blob. 
// Standard VIA `DYNAMIC_KEYMAP_GET_BUFFER` fetches raw EEPROM bytes for the keymap.
export async function getKeymapBuffer(offset: number, size: number): Promise<Uint8Array> {
  const payload = new Uint8Array([(offset >> 8) & 0xff, offset & 0xff, size]);
  const r = await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_GET_BUFFER, payload);
  // Response: [0x12, ...data]
  return r.slice(1);
}

// Lighting
export async function getLightingValue(id: number): Promise<number[]> {
  const payload = new Uint8Array([id]);
  const r = await sendViaCommand(ViaCommand.LIGHTING_GET_VALUE, payload);
  // Response: [0x07, val1, val2...]
  return Array.from(r.slice(1));
}

export async function setLightingValue(id: number, value: number): Promise<void> {
  const payload = new Uint8Array([id, value]);
  await sendViaCommand(ViaCommand.LIGHTING_SET_VALUE, payload);
}

export async function setLightingValue2(id: number, val1: number, val2: number): Promise<void> {
  const payload = new Uint8Array([id, val1, val2]);
  await sendViaCommand(ViaCommand.LIGHTING_SET_VALUE, payload);
}

// Macros
export async function getMacroCount(): Promise<number> {
  const r = await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_MACRO_GET_COUNT);
  if (r.length >= 2) return r[1];
  return 16;
}

export async function getMacroBufferSize(): Promise<number> {
  const r = await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_MACRO_GET_BUFFER_SIZE);
  if (r.length >= 3) {
    return (r[1] << 8) | r[2];
  }
  return 0;
}

export async function getMacroBuffer(offset: number, size: number): Promise<Uint8Array> {
  const payload = new Uint8Array([(offset >> 8) & 0xff, offset & 0xff, size]);
  const r = await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_MACRO_GET_BUFFER, payload);
  return r.slice(1);
}

export async function setMacroBuffer(offset: number, data: Uint8Array): Promise<void> {
  let currentOffset = offset;
  let remaining = data.length;
  let dataIndex = 0;
  
  while (remaining > 0) {
    const chunkSize = Math.min(remaining, 28); 
    const chunk = data.slice(dataIndex, dataIndex + chunkSize);
    
    const payload = new Uint8Array(2 + chunkSize);
    payload[0] = (currentOffset >> 8) & 0xff;
    payload[1] = currentOffset & 0xff;
    payload.set(chunk, 2);
    
    await sendViaCommand(ViaCommand.DYNAMIC_KEYMAP_MACRO_SET_BUFFER, payload);
    
    currentOffset += chunkSize;
    dataIndex += chunkSize;
    remaining -= chunkSize;
  }
}

export class QMKService {
  async getProtocolVersion(): Promise<number> {
    return getProtocolVersion();
  }
  async getLayerCount(): Promise<number> {
    return getLayerCount();
  }
  async getKeycode(layer: number, row: number, col: number): Promise<number> {
    return getKeycode(layer, row, col);
  }
  async setKeycode(layer: number, row: number, col: number, keycode: number): Promise<void> {
    return setKeycode(layer, row, col, keycode);
  }
  async getKeymapBuffer(offset: number, size: number): Promise<Uint8Array> {
    return getKeymapBuffer(offset, size);
  }
  async getLightingValue(id: number): Promise<number[]> {
    return getLightingValue(id);
  }
  async setLightingValue(id: number, value: number): Promise<void> {
    return setLightingValue(id, value);
  }
  async setLightingValue2(id: number, val1: number, val2: number): Promise<void> {
    return setLightingValue2(id, val1, val2);
  }
  async getMacroCount(): Promise<number> {
    return getMacroCount();
  }
  async getMacroBufferSize(): Promise<number> {
    return getMacroBufferSize();
  }
  async getMacroBuffer(offset: number, size: number): Promise<Uint8Array> {
    return getMacroBuffer(offset, size);
  }
  async setMacroBuffer(offset: number, data: Uint8Array): Promise<void> {
    return setMacroBuffer(offset, data);
  }
}

const qmk = new QMKService();
export default qmk;
