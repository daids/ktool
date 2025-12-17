"use client";

import React, { useState } from 'react';

interface KeycodeCategory {
  name: string;
  keycodes: { code: string; label: string; title?: string }[];
}

const KEYCODE_CATEGORIES: KeycodeCategory[] = [
  {
    name: 'Basic',
    keycodes: [
      { code: 'KC_NO', label: 'NO' },
      { code: 'KC_TRNS', label: 'TRNS' },
      { code: 'KC_ESC', label: 'ESC' },
      { code: 'KC_ENT', label: 'ENTER' },
      { code: 'KC_SPC', label: 'SPACE' },
      { code: 'KC_BSPC', label: 'BKSP' },
      { code: 'KC_TAB', label: 'TAB' },
      { code: 'KC_CAPS', label: 'CAPS' },
      { code: 'KC_LCTL', label: 'LCTL' },
      { code: 'KC_LSFT', label: 'LSFT' },
      { code: 'KC_LALT', label: 'LALT' },
      { code: 'KC_LGUI', label: 'LGUI' },
      { code: 'KC_RCTL', label: 'RCTL' },
      { code: 'KC_RSFT', label: 'RSFT' },
      { code: 'KC_RALT', label: 'RALT' },
      { code: 'KC_RGUI', label: 'RGUI' },
    ]
  },
  {
    name: 'Letters',
    keycodes: Array.from({ length: 26 }, (_, i) => {
      const char = String.fromCharCode(65 + i);
      return { code: `KC_${char}`, label: char };
    })
  },
  {
    name: 'Numbers',
    keycodes: [
      ...Array.from({ length: 10 }, (_, i) => ({ code: `KC_${i}`, label: String(i) })),
      { code: 'KC_MINS', label: '-' },
      { code: 'KC_EQL', label: '=' },
      { code: 'KC_LBRC', label: '[' },
      { code: 'KC_RBRC', label: ']' },
      { code: 'KC_BSLS', label: '\\' },
      { code: 'KC_SCLN', label: ';' },
      { code: 'KC_QUOT', label: "'" },
      { code: 'KC_GRV', label: '`' },
      { code: 'KC_COMM', label: ',' },
      { code: 'KC_DOT', label: '.' },
      { code: 'KC_SLSH', label: '/' },
    ]
  },
  {
    name: 'Function',
    keycodes: Array.from({ length: 12 }, (_, i) => ({ code: `KC_F${i + 1}`, label: `F${i + 1}` }))
  },
  {
    name: 'Nav',
    keycodes: [
      { code: 'KC_PSCR', label: 'PRTSC' },
      { code: 'KC_SLCK', label: 'SCRLK' },
      { code: 'KC_PAUS', label: 'PAUSE' },
      { code: 'KC_INS', label: 'INS' },
      { code: 'KC_DEL', label: 'DEL' },
      { code: 'KC_HOME', label: 'HOME' },
      { code: 'KC_END', label: 'END' },
      { code: 'KC_PGUP', label: 'PGUP' },
      { code: 'KC_PGDN', label: 'PGDN' },
      { code: 'KC_UP', label: 'UP' },
      { code: 'KC_DOWN', label: 'DOWN' },
      { code: 'KC_LEFT', label: 'LEFT' },
      { code: 'KC_RIGHT', label: 'RIGHT' },
    ]
  },
  {
    name: 'Media',
    keycodes: [
      { code: 'KC_MPLY', label: 'PLAY' },
      { code: 'KC_MUTE', label: 'MUTE' },
      { code: 'KC_VOLU', label: 'VOL+' },
      { code: 'KC_VOLD', label: 'VOL-' },
      { code: 'KC_MNXT', label: 'NEXT' },
      { code: 'KC_MPRV', label: 'PREV' },
      { code: 'KC_MSTP', label: 'STOP' },
    ]
  },
  {
    name: 'Lighting',
    keycodes: [
      { code: 'RGB_TOG', label: 'TOG' },
      { code: 'RGB_MOD', label: 'MODE+' },
      { code: 'RGB_RMOD', label: 'MODE-' },
      { code: 'RGB_HUI', label: 'HUE+' },
      { code: 'RGB_HUD', label: 'HUE-' },
      { code: 'RGB_SAI', label: 'SAT+' },
      { code: 'RGB_SAD', label: 'SAT-' },
      { code: 'RGB_VAI', label: 'VAL+' },
      { code: 'RGB_VAD', label: 'VAL-' },
      { code: 'BL_TOG', label: 'BL TOG' },
      { code: 'BL_INC', label: 'BL +' },
      { code: 'BL_DEC', label: 'BL -' },
    ]
  },
  {
    name: 'Layers',
    keycodes: [
      { code: 'MO(0)', label: 'L0' },
      { code: 'MO(1)', label: 'L1' },
      { code: 'MO(2)', label: 'L2' },
      { code: 'MO(3)', label: 'L3' },
      { code: 'TG(0)', label: 'TG0' },
      { code: 'TG(1)', label: 'TG1' },
      { code: 'TG(2)', label: 'TG2' },
      { code: 'TG(3)', label: 'TG3' },
      { code: 'TO(0)', label: 'TO0' },
      { code: 'TO(1)', label: 'TO1' },
      { code: 'TO(2)', label: 'TO2' },
      { code: 'TO(3)', label: 'TO3' },
    ]
  }
];

interface Props {
  onSelectKeycode: (code: string) => void;
  customKeycodes?: { name: string; title?: string; shortName?: string }[];
}

export default function KeycodePalette({ onSelectKeycode, customKeycodes }: Props) {
  const [activeTab, setActiveTab] = useState<string>('Basic');

  // Merge custom keycodes into categories or add a new category
  const categories = [...KEYCODE_CATEGORIES];
  if (customKeycodes && customKeycodes.length > 0) {
    categories.push({
      name: 'Custom',
      keycodes: customKeycodes.map((k, i) => ({
        // Use a placeholder QMK code or custom range. 
        // For VIA custom codes, they often map to 0x0000-0xFFFF but usually user range starts at 0x7E40 or similar?
        // Actually, VIA maps custom codes to `USER00`, `USER01` etc internally or uses the QMK keycode.
        // If the JSON doesn't provide the code, we might assume they are sequential custom codes?
        // Let's use `CUSTOM(i)` as a placeholder or try to infer.
        // But for the UI, we just pass the `shortName` or `name` as the "code" if we want KeyMapping logic to handle it?
        // The `handleKeycodeSelect` in DashboardPage expects a code string.
        // `getKeycodeValue` in keycodes.ts resolves string to number.
        // We need to support `CUSTOM_0` etc in `keycodes.ts` or allow passing hex directly?
        // Let's assume we pass a special format.
        code: `CUSTOM_${i}`, 
        label: k.shortName || k.name,
        title: k.title || k.name
      }))
    });
  }

  const activeCategory = categories.find(c => c.name === activeTab);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Select Keycode</h3>
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {categories.map(category => (
          <button
            key={category.name}
            onClick={() => setActiveTab(category.name)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === category.name
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex flex-wrap gap-2 h-[300px] overflow-y-auto content-start">
        {activeCategory?.keycodes.map((k) => (
          <button
            key={k.code}
            onClick={() => onSelectKeycode(k.code)}
            className="flex flex-col items-center justify-center w-[52px] h-[54px] rounded border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-colors"
            title={k.title || k.code}
          >
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{k.label}</span>
            <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{k.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
