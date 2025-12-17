'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import qmk from '../../lib/qmk';
import webhid from '../../lib/webhid';
import KeyboardLayout from '../../components/KeyboardLayout';
import KeyMappingTabs from '../../components/KeyMappingTabs';
import KeycodePalette from '../../components/KeycodePalette';
import LightingControl from '../../components/LightingControl';
import MacroEditor from '../../components/MacroEditor';
import via from '../../lib/via';
import { getKeycodeName, getKeycodeValue } from '../../lib/keycodes';
import defaultLayout from '../../keychron_v5.json';

export default function DashboardPage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<HIDDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'lighting' | 'macros' | 'system'>('keys');
  
  // Layout and Keymap state
  const [layoutData, setLayoutData] = useState<any[] | null>(null);
  const [keymapText, setKeymapText] = useState('');
  const [keymapStatus, setKeymapStatus] = useState('');
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null);

  // Load default layout on mount
  useEffect(() => {
    if (!layoutData && defaultLayout) {
      // Parse the default layout
      const rawLayout = defaultLayout.layouts.keymap;
      const parsed = via.parseViaLayout(rawLayout);
      if (Array.isArray(parsed)) {
        console.log('Loaded default layout', parsed);
        setLayoutData(parsed);
      }
    }
  }, [layoutData]);

  useEffect(() => {
    // Check connection on mount
    const checkConnection = async () => {
      if (webhid.connectedDevice) {
        setIsConnected(true);
        setDeviceInfo(webhid.connectedDevice);
        
        // Auto-load if connected
        await loadKeymapFromDevice();
      } else {
        router.push('/');
      }
    };
    checkConnection();
  }, [router]);

  const loadKeymapFromDevice = async () => {
    try {
      setKeymapStatus('Loading...');
      const layers = await qmk.getLayerCount(); // usually 4
      
      // Approximate dimensions for Keychron V5 or generic
      // If we have layoutData, we could try to infer, but layoutData is visual.
      // We'll stick to 5x15 for now as a default if we can't detect.
      const ROWS = 6; // V5 has 6 rows physically in matrix (0-5)
      const COLS = 18; // V5 has up to 17-18 cols
      const bufferSize = layers * ROWS * COLS * 2;
      
      const buffer = await qmk.getKeymapBuffer(0, bufferSize);
      
      // Construct grid for Layer 0 (for now)
      // TODO: Support multiple layers in UI
      const grid: string[][] = [];
      for(let r=0; r<ROWS; r++) {
         const row: string[] = [];
         for(let c=0; c<COLS; c++) {
            // Layer 0
            const offset = (0 * ROWS * COLS + r * COLS + c) * 2;
            let val = 0;
            if (offset + 1 < buffer.length) {
               val = (buffer[offset] << 8) | buffer[offset+1];
            }
            row.push(getKeycodeName(val));
         }
         grid.push(row);
      }
      
      setKeymapText(JSON.stringify(grid, null, 2));
      setKeymapStatus('Loaded');
    } catch (err) {
      console.error(err);
      setKeymapStatus('Failed to load: ' + (err as Error).message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        
        // Parse VIA layout
        // It might be a full VIA definition { layouts: {...} } or just the array of arrays
        let rawLayout = json;
        if (json.layouts && json.layouts.keymap) {
           rawLayout = json.layouts.keymap;
        } else if (json.layouts) {
           // Maybe layouts.ansi or something
           const keys = Object.keys(json.layouts);
           if (keys.length > 0) rawLayout = json.layouts[keys[0]];
        }
        
        const parsed = via.parseViaLayout(rawLayout);
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

  const handleKeyClick = (index: number) => {
    setSelectedKeyIndex(index);
  };

  const handleKeycodeSelect = async (code: string) => {
    if (selectedKeyIndex === null || !layoutData) return;
    
    // Find the row/col for the selected key
    // Since via.ts normalizeRows returns a flat-compatible structure (row array of keys)
    // We can just flatten it.
    const flatLayout = layoutData.flat();
    const key = flatLayout[selectedKeyIndex];
    
    if (!key || typeof key !== 'object' || key.row === undefined || key.col === undefined) {
      console.warn('Selected key has no matrix coordinates');
      return;
    }
    
    const targetRow = key.row;
    const targetCol = key.col;
    
    // Update local state
    const grid = tryParseJsonGrid(keymapText);
    if (grid) {
      const newGrid = grid.map(r => [...r]);
      // Check bounds
      if (targetRow < newGrid.length && targetCol < newGrid[targetRow].length) {
        newGrid[targetRow][targetCol] = code;
        setKeymapText(JSON.stringify(newGrid, null, 2));
        
        // Update device
        try {
          const val = getKeycodeValue(code);
          await qmk.setKeycode(0, targetRow, targetCol, val);
        } catch (err) {
          console.error('Failed to update device', err);
          alert('Failed to update device');
        }
      } else {
         console.warn(`Matrix mismatch: Key at ${targetRow},${targetCol} but grid is ${newGrid.length}x${newGrid[0]?.length}`);
      }
    }
  };


  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'keys':
        return (
          <div className="flex flex-col h-full">
            {/* Virtual Keyboard - Full Screen */}
            {layoutData && (
              <div className="flex-1 relative">
                {(() => {
                  const grid = tryParseJsonGrid(keymapText);
                  let mapping = grid ? grid.flat() : undefined;

                  // Map CUSTOM_X to short names if available
                  if (mapping && defaultLayout?.customKeycodes) {
                    mapping = mapping.map(code => {
                      if (code.startsWith('CUSTOM_')) {
                        const idx = parseInt(code.replace('CUSTOM_', ''), 10);
                        const custom = defaultLayout.customKeycodes[idx];
                        return custom ? (custom.shortName || custom.name) : code;
                      }
                      return code;
                    });
                  }

                  return (
                    <KeyboardLayout
                      layout={layoutData}
                      mapping={mapping}
                      isViaLayout={true}
                      onKeyClick={handleKeyClick}
                      selectedKeyIndex={selectedKeyIndex}
                    />
                  );
                })()}
              </div>
            )}

            {/* Keycode Selection - Fixed at bottom */}
            {(() => {
              const grid = tryParseJsonGrid(keymapText);
              if (grid && layoutData) {
                return (
                  <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    {/* Selected Key Info */}
                    {selectedKeyIndex !== null && (
                      <div className="text-center py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">
                        Editing Key #{selectedKeyIndex}
                      </div>
                    )}

                    {/* Keycode Palette */}
                    <div className="p-4">
                      <KeycodePalette
                        onSelectKeycode={handleKeycodeSelect}
                        customKeycodes={defaultLayout.customKeycodes}
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Please load a layout file (JSON) to start editing.
                  </p>
                </div>
              );
            })()}
          </div>
        );

      case 'lighting':
        return (
          <div className="max-w-4xl mx-auto">
            <LightingControl lightingEffects={defaultLayout.lighting.underglowEffects as [string, number][]} />
          </div>
        );

      case 'macros':
        return (
          <div className="max-w-4xl mx-auto">
            <MacroEditor />
          </div>
        );

      case 'system':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
              System Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                  Device Info
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Device:</span>
                    <span className="text-black dark:text-zinc-50">{deviceInfo?.productName ?? 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Vendor ID:</span>
                    <span className="text-black dark:text-zinc-50">{deviceInfo?.vendorId?.toString(16) ?? '?'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-black font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-black dark:text-zinc-50">
                KTool
              </h1>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {deviceInfo?.productName ?? 'Connected'}
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex space-x-1">
              {(['keys', 'lighting', 'macros', 'system'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-zinc-50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className={`flex-1 overflow-hidden ${activeTab === 'keys' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        {renderTabContent()}
      </main>
    </div>
  );
}
