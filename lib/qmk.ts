import webhid from './webhid';

// Basic QMK-like command set (simple, extendable)
export const QMK = {
  PING: 0x01,
  GET_VERSION: 0x02,
  RESET_TO_BOOTLOADER: 0x03,
  EEPROM_READ: 0x10,
  EEPROM_WRITE: 0x11,
  KEYMAP_GET: 0x20,
  KEYMAP_SET: 0x21,
} as const;

async function sendQmkCommand(cmd: number, payload?: Uint8Array, timeout = 5000): Promise<Uint8Array> {
  if (!webhid.isSupported()) throw new Error('WebHID not supported');
  const body = new Uint8Array((payload?.length ?? 0) + 1);
  body[0] = cmd & 0xff;
  if (payload) body.set(payload, 1);
  const resp = await webhid.sendRequest(0, body, timeout);
  return resp;
}

export async function ping(): Promise<string> {
  const r = await sendQmkCommand(QMK.PING);
  return new TextDecoder().decode(r);
}

export async function getVersion(): Promise<string> {
  const r = await sendQmkCommand(QMK.GET_VERSION);
  return new TextDecoder().decode(r);
}

export async function resetToBootloader(): Promise<void> {
  await sendQmkCommand(QMK.RESET_TO_BOOTLOADER);
}

export async function readEeprom(address = 0, length = 32): Promise<Uint8Array> {
  const buf = new Uint8Array(3);
  buf[0] = address & 0xff;
  buf[1] = (address >> 8) & 0xff;
  buf[2] = length & 0xff;
  const r = await sendQmkCommand(QMK.EEPROM_READ, buf);
  return r;
}

export async function writeEeprom(address = 0, data: Uint8Array): Promise<void> {
  const header = new Uint8Array(2);
  header[0] = address & 0xff;
  header[1] = (address >> 8) & 0xff;
  const body = new Uint8Array(header.length + data.length);
  body.set(header, 0);
  body.set(data, header.length);
  await sendQmkCommand(QMK.EEPROM_WRITE, body);
}

export async function getKeymap(): Promise<Uint8Array> {
  const r = await sendQmkCommand(QMK.KEYMAP_GET);
  return r;
}

export async function setKeymap(data: Uint8Array): Promise<void> {
  await sendQmkCommand(QMK.KEYMAP_SET, data);
}

export default {
  sendQmkCommand,
  ping,
  getVersion,
  resetToBootloader,
  readEeprom,
  writeEeprom,
  getKeymap,
  setKeymap,
};
