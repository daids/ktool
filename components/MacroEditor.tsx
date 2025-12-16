"use client";

import React, { useState, useEffect } from 'react';
import qmk from '../lib/qmk';
import { getKeycodeName } from '../lib/keycodes';

export default function MacroEditor() {
  const [selectedMacro, setSelectedMacro] = useState(0);
  const [macros, setMacros] = useState<Uint8Array[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [macroText, setMacroText] = useState('');

  useEffect(() => {
    loadMacros();
  }, []);

  useEffect(() => {
    if (macros[selectedMacro]) {
      // Convert to Hex string
      const hex = Array.from(macros[selectedMacro])
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      setMacroText(hex);
    } else {
      setMacroText('');
    }
  }, [selectedMacro, macros]);

  const loadMacros = async () => {
    try {
      setLoading(true);
      setStatus('Loading macros...');
      
      const count = await qmk.getMacroCount();
      const size = await qmk.getMacroBufferSize();
      
      if (size === 0) {
        setStatus('No macro buffer available');
        setLoading(false);
        return;
      }

      // Read full buffer
      // We might need to chunk read if size is large, but getKeymapBuffer logic in qmk.ts handles chunks?
      // No, getMacroBuffer does one request. We need to chunk read if it's large.
      // But let's try reading in 28 byte chunks or just read 128 bytes at a time?
      // qmk.getMacroBuffer takes offset and size.
      // Max packet size is limited. 
      
      const CHUNK_SIZE = 28;
      const buffer = new Uint8Array(size);
      
      for (let i = 0; i < size; i += CHUNK_SIZE) {
        const chunk = await qmk.getMacroBuffer(i, Math.min(CHUNK_SIZE, size - i));
        buffer.set(chunk, i);
      }

      // Parse macros (separated by 0x00)
      const parsedMacros: Uint8Array[] = [];
      let start = 0;
      for (let i = 0; i < count; i++) {
        // Find next 0x00
        let end = start;
        while (end < buffer.length && buffer[end] !== 0x00) {
          end++;
        }
        // If we reached end of buffer without 0x00, take up to end
        // Note: QMK macros usually end with 0x00 (END).
        parsedMacros.push(buffer.slice(start, end));
        start = end + 1; // skip 0x00
        if (start >= buffer.length) break;
      }
      
      // Fill remaining if less than count
      while (parsedMacros.length < count) {
        parsedMacros.push(new Uint8Array(0));
      }

      setMacros(parsedMacros);
      setStatus('Loaded');
    } catch (err) {
      console.error(err);
      setStatus('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentMacro = async () => {
    try {
      setStatus('Saving...');
      // Parse hex string back to bytes
      const bytes = macroText.trim().split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n));
      
      // Update local state
      const newMacros = [...macros];
      newMacros[selectedMacro] = new Uint8Array(bytes);
      setMacros(newMacros);
      
      // Reconstruct full buffer
      // Join all macros with 0x00
      let totalSize = 0;
      newMacros.forEach(m => totalSize += m.length + 1);
      
      // Check max size
      const maxBufferSize = await qmk.getMacroBufferSize();
      if (totalSize > maxBufferSize) {
        alert(`Macro buffer overflow! Size ${totalSize} > ${maxBufferSize}`);
        setStatus('Error: Buffer overflow');
        return;
      }
      
      const buffer = new Uint8Array(totalSize);
      let offset = 0;
      newMacros.forEach(m => {
        buffer.set(m, offset);
        offset += m.length;
        buffer[offset] = 0x00; // End delimiter
        offset++;
      });
      
      // Pad with 0x00? Or just write used size?
      // Better to write up to totalSize.
      
      await qmk.setMacroBuffer(0, buffer);
      setStatus('Saved');
      
    } catch (err) {
      console.error(err);
      setStatus('Failed to save');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Macro Editor</h2>
        <div className="flex items-center space-x-4">
           <span className="text-sm text-gray-500">{status}</span>
           <button 
             onClick={loadMacros}
             disabled={loading}
             className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
           >
             Reload
           </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="col-span-1 space-y-2 max-h-[500px] overflow-y-auto">
           {macros.map((m, i) => (
              <button 
                key={i}
                onClick={() => setSelectedMacro(i)}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors flex justify-between ${
                  selectedMacro === i 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <span>Macro {i}</span>
                <span className="text-xs opacity-70 self-center">{m.length} bytes</span>
              </button>
           ))}
           {macros.length === 0 && !loading && (
             <div className="text-sm text-gray-500 text-center py-4">No macros found</div>
           )}
         </div>
         
         <div className="col-span-1 md:col-span-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
           <h3 className="font-medium text-lg mb-4 text-gray-900 dark:text-gray-100">
             Edit Macro {selectedMacro}
           </h3>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 Raw Data (Hex Keycodes)
               </label>
               <textarea 
                 value={macroText}
                 onChange={(e) => setMacroText(e.target.value)}
                 className="w-full h-48 p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                 placeholder="04 15 2A ..."
               />
               <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter QMK keycodes in hex format (e.g. 04 for "A").
              </p>
             </div>
             
             <div className="flex justify-end space-x-3">
               <button 
                 onClick={() => setMacroText('')}
                 className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
               >
                 Clear
               </button>
               <button 
                 onClick={saveCurrentMacro}
                 className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-sm"
               >
                 Save Macro
               </button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}
