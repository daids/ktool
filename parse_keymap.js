const fs = require('fs');

const data = JSON.parse(fs.readFileSync('keychron_v5.json', 'utf8'));
const keymap = data.layouts.keymap;

const keys = [];
let rowIndex = 0;

keymap.forEach((row, rowIdx) => {
  let current_x = 0;
  let current_y = rowIndex;
  let current_c = "#aaaaaa";
  let current_w = 1;
  let current_h = 1;

  row.forEach(item => {
    if (typeof item === 'object') {
      if (item.x !== undefined) current_x += item.x;
      if (item.y !== undefined) current_y += item.y;
      if (item.c !== undefined) current_c = item.c;
      if (item.w !== undefined) current_w = item.w;
      if (item.h !== undefined) current_h = item.h;
    } else if (typeof item === 'string') {
      const parts = item.split('\n');
      const matrix = parts[0];
      const label = parts[1] || matrix;
      const [mr, mc] = matrix.split(',').map(Number);
      keys.push({
        x: current_x,
        y: current_y,
        w: current_w,
        h: current_h,
        c: current_c,
        matrix_row: mr,
        matrix_col: mc,
        label: label
      });
      current_x += current_w;
    }
  });

  rowIndex += 1; // assume 1 unit per row
});

// Generate HTML
let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulated Keyboard Layout</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .keyboard { position: relative; border: 1px solid #ccc; display: inline-block; background: #f0f0f0; }
        .key { position: absolute; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #000; }
    </style>
</head>
<body>
    <h1>Keychron V5 ANSI Simulated Layout</h1>
    <div class="keyboard">
`;

keys.forEach(key => {
  const left = key.x * 40; // scale factor
  const top = key.y * 40;
  const width = key.w * 40;
  const height = key.h * 40;
  html += `        <div class="key" style="left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; background-color: ${key.c};">${key.label}</div>\n`;
});

html += `    </div>
</body>
</html>`;

fs.writeFileSync('simulated_keyboard.html', html);

console.log('Simulated keyboard HTML generated: simulated_keyboard.html');
