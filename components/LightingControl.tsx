"use client";

import React, { useEffect, useState } from 'react';
import qmk, { LightingValue } from '../lib/qmk';

interface Props {
  lightingEffects?: [string, number][];
}

export default function LightingControl({ lightingEffects }: Props) {
  const [brightness, setBrightness] = useState(0);
  const [effect, setEffect] = useState(0);
  const [effectSpeed, setEffectSpeed] = useState(0);
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0);
  const [val, setVal] = useState(0);

  const loadValues = async () => {
    try {
      // Note: In real VIA, we might need to fetch these one by one or in a block
      // Our qmk.getLightingValue returns array of values.
      // Let's assume we can fetch them individually for now as per our API.
      
      const b = await qmk.getLightingValue(LightingValue.BACKLIGHT_BRIGHTNESS);
      if (b.length) setBrightness(b[0]);

      const e = await qmk.getLightingValue(LightingValue.BACKLIGHT_EFFECT);
      if (e.length) setEffect(e[0]);
      
      // RGB Light values (if supported)
      const rgb_e = await qmk.getLightingValue(LightingValue.RGBLIGHT_EFFECT);
      if (rgb_e.length) setEffect(rgb_e[0]); // Overwrite if RGB is main

      const rgb_s = await qmk.getLightingValue(LightingValue.RGBLIGHT_EFFECT_SPEED);
      if (rgb_s.length) setEffectSpeed(rgb_s[0]);

      // Color (Hue, Sat, Val) might be part of RGBLIGHT_COLOR or separate
      // For simplicity in this demo, we'll just track basic brightness/effect
    } catch (err) {
      console.error('Failed to load lighting values', err);
    }
  };

  useEffect(() => {
    loadValues();
  }, []);

  const handleBrightnessChange = async (v: number) => {
    setBrightness(v);
    await qmk.setLightingValue(LightingValue.BACKLIGHT_BRIGHTNESS, v);
    await qmk.setLightingValue(LightingValue.RGBLIGHT_BRIGHTNESS, v);
  };

  const handleEffectChange = async (v: number) => {
    setEffect(v);
    await qmk.setLightingValue(LightingValue.BACKLIGHT_EFFECT, v);
    await qmk.setLightingValue(LightingValue.RGBLIGHT_EFFECT, v);
  };

  const handleSpeedChange = async (v: number) => {
    setEffectSpeed(v);
    await qmk.setLightingValue(LightingValue.RGBLIGHT_EFFECT_SPEED, v);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Backlight Control</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Brightness ({Math.round(brightness / 255 * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Effect Mode ({effect})
            </label>
            {lightingEffects && lightingEffects.length > 0 ? (
              <select
                value={effect}
                onChange={(e) => handleEffectChange(parseInt(e.target.value))}
                className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {lightingEffects.map(([name, val], i) => (
                  // Use index if value is not unique or just use index as ID if strictly sequential
                  // Usually the second element is the value or ID?
                  // In keychron_v5.json: ["01. SOLID_COLOR", 1]
                  // Actually the value 1 might be a flag or param count?
                  // QMK effects are usually sequential IDs.
                  // Let's assume the index in the list corresponds to the effect ID, or we use the index.
                  // But standard QMK has specific IDs.
                  // If the list matches the firmware order, index is fine.
                  // Let's use the index for now as the value, or try to infer.
                  // The JSON has ["00. None", 0], ["01. SOLID_COLOR", 1]...
                  // The number seems to be `enabled` flag or something?
                  // Let's assume index is the effect ID.
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
            <div className="flex gap-2">
               <button 
                 onClick={() => handleEffectChange(Math.max(0, effect - 1))}
                 className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
               >
                 Prev
               </button>
               <button 
                 onClick={() => handleEffectChange(Math.min(255, effect + 1))}
                 className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
               >
                 Next
               </button>
            </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Effect Speed ({effectSpeed})
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={effectSpeed}
              onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
