"use client";

import { useEffect, useState } from 'react';
import webhid from '../lib/webhid';
import qmk from '../lib/qmk';
import KeymapEditor from '../components/KeymapEditor';
import KeyboardLayout from '../components/KeyboardLayout';
import via from '../lib/via';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [chunkSize, setChunkSize] = useState<number | null>(null);
  const [newChunkValue, setNewChunkValue] = useState<string>('64');
  const [keymapText, setKeymapText] = useState<string>('');
  const [keymapStatus, setKeymapStatus] = useState<string>('');
  const [layoutData, setLayoutData] = useState<any[] | null>(null);

  // Load default layout on mount
  useEffect(() => {
    fetch('/keychron_v5.json')
      .then(res => res.json())
      .then(data => {
        const viaLayout = via.parseViaLayout(data);
        if (viaLayout) {
          setLayoutData(viaLayout);
        }
      })
      .catch(err => console.error('Failed to load default layout', err));
  }, []);

  useEffect(() => {
    let off: (() => void) | null = null;
    if (isConnected) {
      // update displayed chunk size when connected
      try {
        setChunkSize(webhid.getChunkSize());
      } catch (e) {
        setChunkSize(null);
      }
      off = webhid.onInputReport((event) => {
        // example: log reportId and bytes
        console.log('inputreport', event.reportId, new Uint8Array(event.data.buffer));
      });
    }

    return () => {
      if (off) off();
    };
  }, [isConnected]);

  const connectKeyboard = async () => {
    if (!webhid.isSupported()) {
      alert('WebHID is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const d = await webhid.requestAndOpen();
      if (d) {
        setIsConnected(true);
        const isDemo = d.productName?.includes('Demo') ?? false;
        setDeviceInfo(`${d.productName ?? 'Unknown'} (${d.vendorId?.toString(16) ?? '?'}) ${isDemo ? '(Demo Mode)' : ''}`);
        // refresh chunk size display
        try {
          setChunkSize(webhid.getChunkSize());
        } catch (e) {
          setChunkSize(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to keyboard.');
    }
  };

  const disconnectKeyboard = async () => {
    await webhid.close();
    setIsConnected(false);
    setDeviceInfo(null);
  };

  const sendPing = async () => {
    try {
      // payload example: ASCII 'ping'
      const text = await qmk.ping();
      alert('Ping response: ' + text);
    } catch (err) {
      console.error('sendPing error', err);
      alert('sendPing failed: ' + (err as Error).message);
    }
  };

  const getVersion = async () => {
    try {
      const v = await qmk.getVersion();
      alert('QMK Version: ' + v);
    } catch (err) {
      console.error(err);
      alert('getVersion failed');
    }
  };

  const readEepromDemo = async () => {
    try {
      const data = await qmk.readEeprom(0, 32);
      const hex = Array.from(data).map((b) => b.toString(16).padStart(2, '0')).join(' ');
      alert('EEPROM[0..31]: ' + hex);
    } catch (err) {
      console.error(err);
      alert('EEPROM read failed');
    }
  };

  const resetBootloader = async () => {
    if (!confirm('Reset keyboard into bootloader?')) return;
    try {
      await qmk.resetToBootloader();
      alert('Reset command sent');
    } catch (err) {
      console.error(err);
      alert('Reset failed');
    }
  };

  // Keymap editor actions
  const loadKeymapFromDevice = async () => {
    try {
      setKeymapStatus('Loading...');
      const data = await qmk.getKeymap();
      // Try parse as UTF-8 JSON
      try {
        const text = new TextDecoder().decode(data);
        const parsed = JSON.parse(text);
        const pretty = JSON.stringify(parsed, null, 2);
        setKeymapText(pretty);
        setKeymapStatus('Loaded JSON keymap from device');
        return;
      } catch (e) {
        // not JSON, show hex
        const hex = Array.from(data).map((b) => b.toString(16).padStart(2, '0')).join(' ');
        setKeymapText(hex);
        setKeymapStatus('Loaded raw keymap (hex) from device');
        return;
      }
    } catch (err) {
      console.error(err);
      setKeymapStatus('Failed to load keymap');
    }
  };

  const applyKeymapToDevice = async () => {
    try {
      setKeymapStatus('Sending...');
      let data: Uint8Array;
      // If keymapText is JSON, send encoded JSON; otherwise try hex bytes
      try {
        const parsed = JSON.parse(keymapText);
        const s = JSON.stringify(parsed);
        data = new TextEncoder().encode(s);
      } catch (e) {
        // parse hex
        const parts = keymapText.trim().split(/\s+/);
        const bytes = parts.map((p) => parseInt(p, 16) & 0xff);
        data = new Uint8Array(bytes);
      }
      await qmk.setKeymap(data);
      setKeymapStatus('Keymap applied to device');
    } catch (err) {
      console.error(err);
      setKeymapStatus('Failed to apply keymap');
    }
  };

  const downloadKeymap = () => {
    const blob = new Blob([keymapText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keymap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadKeymapFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result ?? '');
      setKeymapText(txt);
      setKeymapStatus('Loaded keymap from file');
    };
    reader.readAsText(file);
  };

  const uploadLayoutFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result ?? '');
        const parsed = JSON.parse(txt);
        // try VIA parsing first
        const viaLayout = via.parseViaLayout(parsed);
        if (viaLayout) {
          setLayoutData(viaLayout);
          return;
        }
        if (!Array.isArray(parsed)) {
          alert('Layout file must be an array of rows or a VIA layout');
          return;
        }
        setLayoutData(parsed);
      } catch (err) {
        console.error(err);
        alert('Failed to parse layout file');
      }
    };
    reader.readAsText(file);
  };

  const exportViaLayout = () => {
    if (!layoutData) {
      alert('No layout loaded');
      return;
    }
    const obj = via.buildViaLayout(layoutData, { name: 'ktool-export' });
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout-via.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // helper to detect grid-structured JSON
  function tryParseJsonGrid(txt: string): any[] | null {
    try {
      const v = JSON.parse(txt);
      if (!Array.isArray(v)) return null;
      // simple detect: array of arrays or array of objects with consistent keys
      if (v.every((r: any) => Array.isArray(r))) return v;
      if (v.every((r: any) => typeof r === 'object' && r !== null)) {
        // convert to array of rows (values)
        return v.map((r: any) => Object.values(r));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  const applyChunkSize = () => {
    const val = Number(newChunkValue);
    if (!Number.isFinite(val) || val < 16) {
      alert('Chunk size must be a number >= 16');
      return;
    }
    try {
      webhid.setChunkSize(val);
      setChunkSize(webhid.getChunkSize());
      alert('Chunk size set to ' + webhid.getChunkSize());
    } catch (err) {
      console.error(err);
      alert('Failed to set chunk size');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-4">
            Mechanical Keyboard Manager
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Manage your mechanical keyboard configurations, similar to VIA. Use WebHID to connect directly to your keyboard.
          </p>
          <div className="flex gap-4 justify-center">
              {!isConnected ? (
              <button
                onClick={connectKeyboard}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Keyboard
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-green-600 dark:text-green-400">Keyboard Connected!</p>
                <button
                  onClick={disconnectKeyboard}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={sendPing}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Send Ping
                </button>
                <div className="flex gap-2 mt-2">
                  <button onClick={getVersion} className="px-3 py-1 bg-sky-500 text-white rounded">Get Version</button>
                  <button onClick={readEepromDemo} className="px-3 py-1 bg-yellow-500 text-white rounded">Read EEPROM</button>
                  <button onClick={resetBootloader} className="px-3 py-1 bg-red-700 text-white rounded">Reset Bootloader</button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">Chunk size:</div>
                  <div className="text-sm font-medium">{chunkSize ?? 'unknown'}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newChunkValue}
                    onChange={(e) => setNewChunkValue(e.target.value)}
                    className="w-24 rounded border px-2 py-1"
                  />
                  <button
                    onClick={applyChunkSize}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded text-sm"
                  >
                    Set Chunk Size
                  </button>
                </div>
                <div className="mt-4 w-full max-w-2xl text-left">
                  <h3 className="text-lg font-medium mb-2">Keymap Editor (VIA style)</h3>
                  <div className="flex gap-2 mb-2">
                    <button onClick={loadKeymapFromDevice} className="px-3 py-1 bg-slate-600 text-white rounded">Load from Device</button>
                    <button onClick={applyKeymapToDevice} className="px-3 py-1 bg-emerald-600 text-white rounded">Apply to Device</button>
                    <button onClick={downloadKeymap} className="px-3 py-1 bg-blue-500 text-white rounded">Download JSON</button>
                    <label className="px-3 py-1 bg-gray-200 rounded cursor-pointer">
                      Upload Keymap
                      <input type="file" accept=".json,.txt" onChange={(e) => uploadKeymapFile(e.target.files?.[0] ?? null)} className="hidden" />
                    </label>
                    <label className="px-3 py-1 bg-gray-200 rounded cursor-pointer">
                      Upload Layout
                      <input type="file" accept=".json" onChange={(e) => uploadLayoutFile(e.target.files?.[0] ?? null)} className="hidden" />
                    </label>
                    <button onClick={exportViaLayout} className="px-3 py-1 bg-indigo-500 text-white rounded">Export VIA</button>
                  </div>
                  <textarea
                    value={keymapText}
                    onChange={(e) => setKeymapText(e.target.value)}
                    rows={12}
                    className="w-full rounded border p-2 font-mono text-sm bg-white dark:bg-black dark:text-zinc-50"
                    placeholder='Paste JSON keymap here or load from device'
                  />
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{keymapStatus}</div>
                </div>
                <div className="mt-4 w-full max-w-2xl">
                  <h4 className="text-sm font-medium mb-2">Visual Editor Preview</h4>
                  {(() => {
                    const grid = tryParseJsonGrid(keymapText);
                    if (grid) {
                      return (
                        <div>
                          <KeymapEditor data={grid} onChange={(d) => setKeymapText(JSON.stringify(d, null, 2))} />
                          <div className="mt-4">
                            {layoutData ? (
                              <KeyboardLayout layout={layoutData} mapping={grid.flat()} isViaLayout={true} />
                            ) : (
                              <div className="text-sm text-zinc-500">Upload a layout JSON to visualize key positions.</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return <div className="text-sm text-zinc-500">Edit valid JSON array-of-rows to enable visual editor.</div>;
                  })()}
                </div>
                {/* Always show keyboard layout when available */}
                {layoutData && (
                  <div className="mt-8 w-full max-w-4xl">
                    <h4 className="text-sm font-medium mb-2">Keyboard Layout</h4>
                    <KeyboardLayout layout={layoutData} isViaLayout={true} />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
            <p>Note: WebHID is supported in Chrome and Edge browsers.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
