"use client";

import React, { useMemo, useState } from 'react';

type KeymapData = (string | number | null | undefined)[][];
type Props = {
  data: KeymapData;
  onChange: (newData: KeymapData) => void;
};

function stringifyCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function KeymapEditor({ data, onChange }: Props) {
  // normalize data to 2D array of strings
  const local = useMemo((): string[][] => {
    if (!Array.isArray(data)) return [];
    return data.map((r) => {
      if (Array.isArray(r)) return r.map((c) => stringifyCell(c));
      // try object mapping
      if (typeof r === 'object' && r !== null) {
        return Object.values(r as Record<string, unknown>).map((v) => stringifyCell(v));
      }
      return [stringifyCell(r)];
    });
  }, [data]);

  const [editState, setEditState] = useState<string[][]>(local);

  const updateCell = (rIdx: number, cIdx: number, val: string) => {
    const copy = editState.map((r) => r.slice());
    copy[rIdx][cIdx] = val;
    setEditState(copy);
    // propagate as simple array of arrays of strings
    onChange(copy);
  };

  const addRow = () => {
    const copy = editState.map((r) => r.slice());
    copy.push(['']);
    setEditState(copy);
    onChange(copy);
  };

  const addCol = (rowIndex: number) => {
    const copy = editState.map((r) => r.slice());
    copy[rowIndex].push('');
    setEditState(copy);
    onChange(copy);
  };

  const removeRow = (rowIndex: number) => {
    if (editState.length <= 1) return; // Keep at least one row
    const copy = editState.filter((_, i) => i !== rowIndex);
    setEditState(copy);
    onChange(copy);
  };

  const removeCol = (rowIndex: number, colIndex: number) => {
    if (editState[rowIndex].length <= 1) return; // Keep at least one column per row
    const copy = editState.map((r) => r.filter((_, i) => i !== colIndex));
    setEditState(copy);
    onChange(copy);
  };

  const clearAll = () => {
    const copy = editState.map((r) => r.map(() => ''));
    setEditState(copy);
    onChange(copy);
  };

  if (!local || local.length === 0) return <div className="text-sm text-zinc-500">No grid data to visualize.</div>;

  return (
    <div className="w-full">
      <div className="overflow-auto border rounded p-2 bg-white dark:bg-black">
        {editState.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-2 mb-2 items-center">
            {row.map((cell, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-1">
                <input
                  value={cell}
                  onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                  className="w-24 h-10 text-sm text-center rounded border p-1 font-mono bg-gray-50 dark:bg-neutral-900"
                  placeholder="KC_NO"
                />
                {editState[rIdx].length > 1 && (
                  <button
                    onClick={() => removeCol(rIdx, cIdx)}
                    className="px-1 py-0.5 rounded bg-red-200 hover:bg-red-300 text-xs text-red-700"
                    title="Remove column"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => addCol(rIdx)} className="px-2 py-1 rounded bg-green-200 hover:bg-green-300 text-sm text-green-700" title="Add column">+Col</button>
            {editState.length > 1 && (
              <button
                onClick={() => removeRow(rIdx)}
                className="px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-sm ml-2"
                title="Remove row"
              >
                Del Row
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <button onClick={addRow} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm">Add Row</button>
        <button onClick={clearAll} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm">Clear All</button>
      </div>
    </div>
  );
}
