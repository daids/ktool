// Minimal VIA layout importer/exporter helpers
// Provides simple compatibility: imports common VIA keyboard JSON shapes

export function parseViaLayout(json: any): Array<any[]> | null {
  if (!json) return null;

  // Case 1: 'layouts' : { NAME: [ [..], [..] ] }
  if (json.layouts && typeof json.layouts === 'object') {
    // prefer a common key like 'keymap' or first array value
    if (Array.isArray(json.layouts.keymap)) return normalizeRows(json.layouts.keymap);
    const vals = Object.values(json.layouts);
    if (vals.length > 0 && Array.isArray(vals[0])) {
      // assume already array of rows
      return normalizeRows(vals[0] as Array<any[]>);
    }
  }

  // Case 2: 'keymap' or 'layout' as array-of-rows
  if (Array.isArray(json)) return normalizeRows(json as Array<any[]>);
  if (Array.isArray(json.layout)) return normalizeRows(json.layout as Array<any[]>);

  // Case 3: 'keys' array with x/y/w/h/label coordinates (common in some schemas)
  if (Array.isArray(json.keys)) {
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
    return normalizeRows(rows as any[]);
  }

  return null;
}

// Normalize a VIA-style rows array into rows of key descriptors
function normalizeRows(rows: any[]): Array<any[]> {
  const out: Array<any[]> = [];
  for (const row of rows) {
    if (!Array.isArray(row)) {
      // try to skip non-row entries
      continue;
    }
    const normRow: any[] = [];
    let pendingMeta: any = null;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
        // metadata like {c:'#aaa', w:1.5, x:0.5}
        pendingMeta = cell;
        continue;
      }
      // cell is likely a string like "0,0\nESC" or a simple token
      let label: string | undefined = undefined;
      if (typeof cell === 'string') {
        const parts = cell.split('\n');
        if (parts.length > 1) {
          label = parts.slice(1).join('\n').trim();
        } else {
          // token like '0,1' -- no label
          label = undefined;
        }
      } else if (cell == null) {
        label = undefined;
      } else {
        // fallback to string representation
        label = String(cell);
      }

      const desc: any = {};
      if (label) desc.label = label;
      if (pendingMeta) {
        if (typeof pendingMeta.w === 'number') desc.w = pendingMeta.w;
          if (typeof pendingMeta.h === 'number') desc.h = pendingMeta.h;
          if (typeof pendingMeta.x === 'number') desc.x = pendingMeta.x;
        // preserve other meta for future use
        // desc.meta = pendingMeta;
        pendingMeta = null;
      }

      // if no label and no metadata, keep as empty string to reserve spot
      if (!desc.label && desc.w == null && desc.h == null && desc.x == null && desc.matrix == null) {
        normRow.push('');
      } else {
        // if only label exists, push label string for simpler rendering
        if (desc.w == null && desc.h == null && desc.x == null && !desc.matrix) {
          normRow.push(desc.label ?? '');
        } else {
          normRow.push(desc);
        }
      }
    }
    out.push(normRow);
  }
  return out;
}

export function buildViaLayout(layout: Array<any[]> , meta?: { name?: string }): any {
  // Build a simple VIA-friendly layout: { name, layouts: { keymap: [...] } }
  const name = meta?.name ?? 'ktool-layout';
  return {
    name,
    layouts: {
      keymap: layout,
    },
  };
}

export default { parseViaLayout, buildViaLayout };
