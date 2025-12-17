export interface VIALayoutJSON {
  version?: number;
  layouts?: {
    keymap?: (string | object)[][];
    [key: string]: (string | object)[][] | undefined;
  } | Record<string, any>;
  layout?: (string | object)[][];
  keys?: Array<{
    x?: number;
    y?: number;
    w?: number;
    width?: number;
    h?: number;
    label?: string;
    key?: string;
    text?: string;
    [key: string]: any;
  }>;
  name?: string;
  vendorId?: string;
  productId?: string;
}

export interface VIAKey {
  label?: string;
  row?: number;
  col?: number;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  c?: string;
  [key: string]: any;
}

export function parseViaLayout(json: VIALayoutJSON | (string | object)[][] | any[]): VIAKey[][] | number[][] | null {
  if (!json) return null;

  // Case 0: VIA v3 - layouts as array with map
  if ('version' in json && json.version === 3 && (json as any).layouts && Array.isArray((json as any).layouts)) {
    const layouts = (json as any).layouts;
    if (layouts.length > 0) {
      const firstLayout = layouts[0];
      if (firstLayout.map && Array.isArray(firstLayout.map)) {
        // Return the map as [[r,c], ...] for v3
        return firstLayout.map as number[][];
      }
    }
  }

  // Case 1: 'layouts' : { NAME: [ [..], [..] ] }
  if ('layouts' in json && json.layouts && typeof json.layouts === 'object') {
    // prefer a common key like 'keymap' or first array value
    const layouts = json.layouts as Record<string, (string | object)[][]>;
    if (Array.isArray(layouts.keymap)) return normalizeRows(layouts.keymap);
    const vals = Object.values(layouts);
    if (vals.length > 0 && Array.isArray(vals[0])) {
      // assume already array of rows
      return normalizeRows(vals[0]);
    }
  }

  // Case 2: 'keymap' or 'layout' as array-of-rows
  if (Array.isArray(json)) return normalizeRows(json as unknown as (string | object)[][]);
  if ('layout' in json && Array.isArray(json.layout)) return normalizeRows(json.layout);

  // Case 3: 'keys' array with x/y/w/h/label coordinates (common in some schemas)
  if ('keys' in json && Array.isArray(json.keys)) {
    // group by y coordinate (rounded to nearest integer)
    const buckets: Record<number, any[]> = {};
    for (const k of json.keys) {
      const y = Math.round((k.y ?? 0) * 10) / 10;
      if (!buckets[y]) buckets[y] = [];
      buckets[y].push(k);
    }
    const rows = Object.keys(buckets)
      .map((ky) => ({ y: Number(ky), keys: buckets[Number(ky)] }))
      .sort((a, b) => a.y - b.y)
      .map((r) => r.keys.sort((a: any, b: any) => (a.x ?? 0) - (b.x ?? 0)).map((k: any) => {
        const label = k.label ?? k.key ?? k.text ?? '';
        const w = k.w ?? k.width ?? 1;
        return typeof label === 'string' ? { label, w } : String(label);
      }));
    return normalizeRows(rows);
  }

  return null;
}

// Normalize a VIA-style rows array into rows of key descriptors
function normalizeRows(rows: (string | object)[][]): VIAKey[][] {
  const out: VIAKey[][] = [];
  
  let currentOffsetY = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) {
      // try to skip non-row entries
      continue;
    }
    const normRow: VIAKey[] = [];

    // State that persists across keys in a row
    let currentMeta: Record<string, any> = {};
    let pendingProps: Record<string, any> = {};
    
    let currentX = 0;  // Current X position for automatic key placement
    let pendingX = 0;

    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
        // metadata like {c:'#aaa', w:1.5, x:0.5, y:-0.75}
        const meta = cell as Record<string, any>;

        // Handle geometry accumulations
        if (typeof meta.y === 'number') {
          currentOffsetY += meta.y;
        }
        if (typeof meta.x === 'number') {
          pendingX += meta.x;
        }

        // Merge other metadata (colors, sizes) into current state
        // We exclude geometry props from currentMeta because they are usually one-shot or handled separately
        const { x, y, w, h, x2, y2, w2, h2, ...rest } = meta;
        Object.assign(currentMeta, rest);

        // If w/h are present, we temporarily store them to apply to the NEXT key only?
        // Actually, in KLE, if a style object has {w:2}, it applies to the immediate next key.
        // It does NOT persist for subsequent keys.
        // So we should store them in a 'pendingProps' object that clears after use.
        if (w !== undefined) pendingProps.w = w;
        if (h !== undefined) pendingProps.h = h;
        if (x2 !== undefined) pendingProps.x2 = x2;
        if (y2 !== undefined) pendingProps.y2 = y2;
        if (w2 !== undefined) pendingProps.w2 = w2;
        if (h2 !== undefined) pendingProps.h2 = h2;

        continue;
      }

      // cell is likely a string like "0,0\nESC" or a simple token
      let label: string | undefined = undefined;
      const desc: VIAKey = {};

      if (typeof cell === 'string') {
        const parts = cell.split('\n');
        if (parts.length > 1) {
          // extract matrix coords from parts[0]
          const coords = parts[0].split(',');
          if (coords.length === 2) {
             const r = parseInt(coords[0]);
             const c = parseInt(coords[1]);
             if (!isNaN(r) && !isNaN(c)) {
               desc.row = r;
               desc.col = c;
             }
          }
          label = parts.slice(1).join('\n').trim();
        } else {
          // token like '0,1' -- no label
          // Check if it's a coord pair
          const coords = cell.split(',');
          if (coords.length === 2) {
             const r = parseInt(coords[0]);
             const c = parseInt(coords[1]);
             if (!isNaN(r) && !isNaN(c)) {
               desc.row = r;
               desc.col = c;
             }
          }
          // If not a pair, maybe just a label
          if (desc.row === undefined) {
             label = cell;
          }
        }
      }

      if (label !== undefined) desc.label = label;

      // Apply persistent metadata (colors, etc)
      Object.assign(desc, currentMeta);

      // Apply one-shot properties (width, height, secondary dims)
      Object.assign(desc, pendingProps);
      pendingProps = {};

      // Apply calculated geometry - always set y to row index + offset
      desc.y = rowIndex + currentOffsetY;
      desc.x = currentX + pendingX;  // Use currentX plus any pending offset

      // default width
      if (!desc.w) desc.w = 1;

      normRow.push(desc);

      // Advance currentX by the width of this key
      currentX += desc.w;
    }
    out.push(normRow);
  }
  return out;
}

export function buildViaLayout(layout: VIAKey[][] | number[][], meta?: { name?: string, version?: number }): VIALayoutJSON {
  const name = meta?.name ?? 'ktool-layout';
  const version = meta?.version ?? 2;

  if (version === 3) {
    return {
      version: 3,
      layouts: {
        layouts: [{
          name: name,
          map: layout as number[][]
        }]
      } as any
    };
  }

  // version 2 default
  return {
    name: name,
    vendorId: '0xFEED', // placeholder
    productId: '0x0000', // placeholder
    layouts: {
      keymap: layout as any
    }
  };
}

// 从VIA布局计算matrix坐标到单位坐标的映射
export function buildMatrixToCoordinatesMap(viaLayout: VIALayoutJSON): Map<string, { x: number; y: number; w: number; h: number; c?: string; label?: string }> {
  const matrixMap = new Map<string, { x: number; y: number; w: number; h: number; c?: string; label?: string }>();

  if (!viaLayout.layouts?.keymap) return matrixMap;

  const layout = viaLayout.layouts.keymap;
  const parsedKeys = parseViaLayout(layout);

  if (!parsedKeys) return matrixMap;

  // 处理VIAKey[][]格式
  if (Array.isArray(parsedKeys) && parsedKeys.length > 0 && Array.isArray(parsedKeys[0]) && typeof parsedKeys[0][0] === 'object') {
    const viaKeys = parsedKeys as VIAKey[][];
    for (const row of viaKeys) {
      for (const key of row) {
        if (key.row !== undefined && key.col !== undefined) {
          const matrixKey = `${key.row},${key.col}`;
          matrixMap.set(matrixKey, {
            x: key.x ?? 0,
            y: key.y ?? 0,
            w: key.w ?? 1,
            h: key.h ?? 1,
            c: key.c,
            label: key.label
          });
        }
      }
    }
  }

  return matrixMap;
}



const via = { parseViaLayout, buildViaLayout };
export default via;
