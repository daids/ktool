
// Basic QMK Keycodes Mapping
// Based on standard HID usage IDs and QMK extensions

export const KEYCODES: Record<string, number> = {
  KC_NO: 0x0000,
  KC_TRNS: 0x0001,
  
  // Letters
  KC_A: 0x0004, KC_B: 0x0005, KC_C: 0x0006, KC_D: 0x0007,
  KC_E: 0x0008, KC_F: 0x0009, KC_G: 0x000A, KC_H: 0x000B,
  KC_I: 0x000C, KC_J: 0x000D, KC_K: 0x000E, KC_L: 0x000F,
  KC_M: 0x0010, KC_N: 0x0011, KC_O: 0x0012, KC_P: 0x0013,
  KC_Q: 0x0014, KC_R: 0x0015, KC_S: 0x0016, KC_T: 0x0017,
  KC_U: 0x0018, KC_V: 0x0019, KC_W: 0x001A, KC_X: 0x001B,
  KC_Y: 0x001C, KC_Z: 0x001D,

  // Numbers
  KC_1: 0x001E, KC_2: 0x001F, KC_3: 0x0020, KC_4: 0x0021,
  KC_5: 0x0022, KC_6: 0x0023, KC_7: 0x0024, KC_8: 0x0025,
  KC_9: 0x0026, KC_0: 0x0027,

  // Standard
  KC_ENT: 0x0028, KC_ESC: 0x0029, KC_BSPC: 0x002A, KC_TAB: 0x002B,
  KC_SPC: 0x002C, KC_MINS: 0x002D, KC_EQL: 0x002E, KC_LBRC: 0x002F,
  KC_RBRC: 0x0030, KC_BSLS: 0x0031, KC_NUHS: 0x0032, KC_SCLN: 0x0033,
  KC_QUOT: 0x0034, KC_GRV: 0x0035, KC_COMM: 0x0036, KC_DOT: 0x0037,
  KC_SLSH: 0x0038, KC_CAPS: 0x0039,

  // Function
  KC_F1: 0x003A, KC_F2: 0x003B, KC_F3: 0x003C, KC_F4: 0x003D,
  KC_F5: 0x003E, KC_F6: 0x003F, KC_F7: 0x0040, KC_F8: 0x0041,
  KC_F9: 0x0042, KC_F10: 0x0043, KC_F11: 0x0044, KC_F12: 0x0045,

  // Nav
  KC_PSCR: 0x0046, KC_SLCK: 0x0047, KC_PAUS: 0x0048, KC_INS: 0x0049,
  KC_HOME: 0x004A, KC_PGUP: 0x004B, KC_DEL: 0x004C, KC_END: 0x004D,
  KC_PGDN: 0x004E, KC_RIGHT: 0x004F, KC_LEFT: 0x0050, KC_DOWN: 0x0051,
  KC_UP: 0x0052,

  // Modifiers
  KC_LCTL: 0x00E0, KC_LSFT: 0x00E1, KC_LALT: 0x00E2, KC_LGUI: 0x00E3,
  KC_RCTL: 0x00E4, KC_RSFT: 0x00E5, KC_RALT: 0x00E6, KC_RGUI: 0x00E7,

  // Media (System/Consumer) - Simplified mapping, actual QMK values might differ or be aliases
  // Using QMK's internal values for these often
  KC_MUTE: 0x007F, // This is not standard HID but QMK often maps consumer to 0x04xx range or similar
  // For VIA, it usually uses the QMK keycode values.
  // Let's use some common QMK values for Media if we can find them.
  // 0x00A5-0x00DF are reserved? 
  // QMK's `KC_MUTE` is typically `0x007F` (Keyboard Mute) in HID, but QMK uses `0x00A8`?
  // Let's stick to the basics first. If VIA returns 0x00xx, we map it back.

  // Lighting (QMK Quantum)
  RGB_TOG: 0x7800, RGB_MOD: 0x7801, RGB_HUI: 0x7802, RGB_HUD: 0x7803,
  RGB_SAI: 0x7804, RGB_SAD: 0x7805, RGB_VAI: 0x7806, RGB_VAD: 0x7807,
  
  // Others
  KC_APP: 0x0065,
};

// Reverse mapping
export const KEYCODES_REVERSE: Record<number, string> = {};
Object.entries(KEYCODES).forEach(([k, v]) => {
  KEYCODES_REVERSE[v] = k;
});

export function getKeycodeValue(code: string): number {
  if (code.startsWith('CUSTOM_')) {
    const index = parseInt(code.replace('CUSTOM_', ''), 10);
    // 0x7E40 is typical QK_KB_0 start in QMK/VIA
    return 0x7E40 + index;
  }
  return KEYCODES[code] || 0;
}

export function getKeycodeName(value: number): string {
  if (KEYCODES_REVERSE[value]) return KEYCODES_REVERSE[value];
  
  // Custom Keycodes
  if (value >= 0x7E40 && value <= 0x7E5F) { // Range of 32 custom codes
     return `CUSTOM_${value - 0x7E40}`;
  }

  // Hex fallback
  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
}
