"use client";

import React from 'react';

type KeyDesc = string | { label?: string; w?: number; h?: number; x?: number; y?: number; c?: string };
type Row = KeyDesc[];

type Props = {
  layout: Row[];
  // optional mapping to show key assignment under the label
  mapping?: string[]; // flattened key assignments
  isViaLayout?: boolean; // 是否是VIA格式的布局
};

export default function KeyboardLayout({ layout, mapping, isViaLayout = false }: Props) {
  if (isViaLayout) {
    return <VIAKeyboardLayout layout={layout} mapping={mapping} />;
  }

  // 原有的简单布局显示
  const flattenedKeys = layout.flat();
  const totalKeys = flattenedKeys.length;

  return (
    <div className="keyboard-visual w-full p-4 bg-white dark:bg-neutral-900 rounded border">
      {layout.map((row, r) => {
        const rowStartIndex = layout.slice(0, r).reduce((sum, prevRow) => sum + prevRow.length, 0);

        return (
          <div key={r} className="flex gap-2 mb-2" style={{ alignItems: 'center' }}>
            {row.map((k, c) => {
              const desc = typeof k === 'string' ? { label: k, w: 1 } : { label: k.label ?? '', w: k.w ?? 1 };
              const flex = Math.max(0.25, desc.w ?? 1);
              const globalIndex = rowStartIndex + c;
              const mapLabel = mapping?.[globalIndex] ?? '';
              const keyIndex = globalIndex;

              return (
                <div
                  key={c}
                  className="key-item flex flex-col items-center justify-center rounded border bg-gray-50 dark:bg-neutral-800"
                  style={{ flex: flex, minWidth: 28, padding: '6px 8px' }}
                >
                  <div className="text-xs font-medium">{desc.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">{mapLabel}</div>
                  <div className="text-[9px] text-zinc-400 mt-1">#{keyIndex}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// VIA格式键盘布局组件
function VIAKeyboardLayout({ layout, mapping }: { layout: Row[]; mapping?: string[] }) {
  // 计算所有键的边界
  const allKeys: Array<{ label: string; index: number; x: number; y: number; w: number; h: number; c?: string }> = [];
  let currentX = 0;
  let currentY = 0;
  let globalIndex = 0;
  let currentColor = '#cccccc'; // 默认颜色

  for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
    const row = layout[rowIndex];
    currentX = 0;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const key = row[colIndex];

      if (typeof key === 'object' && key !== null) {
        // 这是样式/定位对象，如 { "c": "#777777" } 或 { "x": 0.5, "w": 2 }
        const styleObj = key as Record<string, any>;
        if (styleObj.c !== undefined) currentColor = styleObj.c;
        if (styleObj.x !== undefined) currentX = styleObj.x;
        if (styleObj.y !== undefined) currentY = styleObj.y;
        // 如果这个对象有w或h，它可能是一个特殊的按键
        if (styleObj.w !== undefined || styleObj.h !== undefined) {
          // 这是一个按键定义
          const label = styleObj.label || '';
          const w = styleObj.w || 1;
          const h = styleObj.h || 1;
          const x = currentX;
          const y = currentY;
          const c = styleObj.c || currentColor;

          allKeys.push({
            label,
            index: globalIndex,
            x,
            y,
            w,
            h,
            c
          });

          currentX += w;
          globalIndex++;
        }
        continue;
      }

      // 处理字符串按键
      let label = '';
      const w = 1;
      const h = 1;
      const x = currentX;
      const y = currentY;
      const c = currentColor;

      if (typeof key === 'string') {
        // 解析VIA格式的字符串，如 "0,0\nESC"
        const parts = key.split('\n');
        if (parts.length > 1) {
          label = parts[1];
        } else {
          // 可能是矩阵坐标，如 "0,0"
          label = key;
        }
      }

      allKeys.push({
        label,
        index: globalIndex,
        x,
        y,
        w,
        h,
        c
      });

      currentX += w;
      globalIndex++;
    }
    currentY += 1;
  }

  // 计算缩放和偏移
  const minX = Math.min(...allKeys.map(k => k.x));
  const minY = Math.min(...allKeys.map(k => k.y));
  const maxX = Math.max(...allKeys.map(k => k.x + k.w));
  const maxY = Math.max(...allKeys.map(k => k.y + k.h));

  const scale = 30; // 每个单位30px，适配PC网页端
  const offsetX = -minX * scale;
  const offsetY = -minY * scale;

  const containerWidth = (maxX - minX) * scale + 40;
  const containerHeight = (maxY - minY) * scale + 40;

  return (
    <div className="keyboard-visual bg-gray-100 dark:bg-neutral-800 rounded border p-4" style={{ width: containerWidth, height: containerHeight }}>
      <div className="relative" style={{ width: containerWidth - 32, height: containerHeight - 32 }}>
        {allKeys.map((key, idx) => {
          const left = (key.x * scale) + offsetX;
          const top = (key.y * scale) + offsetY;
          const width = key.w * scale - 4;
          const height = key.h * scale - 4;
          const mapLabel = mapping?.[key.index] ?? '';
          const label = key.label;

          // 根据颜色设置背景色
          let bgColor = 'bg-gray-200 dark:bg-neutral-700';
          if (key.c) {
            if (key.c === '#cccccc') bgColor = 'bg-gray-300 dark:bg-neutral-600';
            else if (key.c === '#aaaaaa') bgColor = 'bg-gray-400 dark:bg-neutral-500';
            else if (key.c === '#777777') bgColor = 'bg-gray-500 dark:bg-neutral-400';
          }

          return (
            <div
              key={idx}
              className={`absolute flex flex-col items-center justify-center rounded border-2 border-gray-400 dark:border-neutral-500 ${bgColor} shadow-sm`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
                fontSize: key.w > 1.5 ? '12px' : '10px'
              }}
            >
              <div className="font-medium text-center leading-tight">{label}</div>
              {mapLabel && (
                <div className="text-[8px] text-zinc-600 dark:text-zinc-300 mt-1 leading-tight">{mapLabel}</div>
              )}
              <div className="text-[7px] text-zinc-500 dark:text-zinc-400 mt-1">#{key.index}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
