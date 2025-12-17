"use client";

import React, { useState, useEffect, useMemo } from 'react';

type KeyDesc = string | { label?: string; w?: number; h?: number; x?: number; y?: number; c?: string };
type Row = KeyDesc[];
type VIAMap = number[][]; // [[r,c], ...]

interface ViaStyleObject {
  c?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  label?: string;
}

import { VIAKey } from '../lib/via';

type Props = {
  layout: Row[] | VIAMap | VIAKey[][];
  // optional mapping to show key assignment under the label
  mapping?: string[]; // flattened key assignments
  isViaLayout?: boolean; // 是否是VIA格式的布局
  onKeyClick?: (index: number) => void;
  selectedKeyIndex?: number | null;
};

// VIA键盘渲染常量，基于VIA项目的标准
const KEY_WIDTH = 52;      // 单个按键的宽度（像素）
const KEY_HEIGHT = 54;     // 单个按键的高度（像素）
const KEY_X_SPACING = 2;   // X方向按键间距
const KEY_Y_SPACING = 2;   // Y方向按键间距
const KEY_X_POS = KEY_WIDTH + KEY_X_SPACING;  // X方向单位位置
const KEY_Y_POS = KEY_HEIGHT + KEY_Y_SPACING; // Y方向单位位置

// 简化的按键接口
interface SimpleKey {
  x: number;
  y: number;
  w: number;
  h: number;
  c?: string;
  label?: string;
  index: number;
}

// 简化的VIA布局解析，基于parse_keymap.js的逻辑
function parseVIALayout(layout: Row[]): SimpleKey[] {
  const keys: SimpleKey[] = [];
  let globalIndex = 0;

  for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
    const row = layout[rowIndex];
    let currentX = 0;
    let currentY = rowIndex;
    let currentC = '#cccccc';
    let currentW = 1;
    let currentH = 1;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const item = row[colIndex];

      if (typeof item === 'object' && item !== null) {
        // 样式对象，更新当前属性
        const style = item as ViaStyleObject;
        if (style.x !== undefined) currentX += style.x;
        if (style.y !== undefined) currentY += style.y;
        if (style.c !== undefined) currentC = style.c;
        if (style.w !== undefined) currentW = style.w;
        if (style.h !== undefined) currentH = style.h;
      } else if (typeof item === 'string') {
        // 按键字符串，创建按键
        const parts = item.split('\n');
        const matrix = parts[0];
        const label = parts[1] || matrix;

        const key: SimpleKey = {
          x: currentX,
          y: currentY,
          w: currentW,
          h: currentH,
          c: currentC,
          label,
          index: globalIndex
        };

        keys.push(key);

        // 前进到下一个按键位置
        currentX += currentW;
        globalIndex++;
      }
    }
  }

  return keys;
}

// 根据配置文件的keymap索引进行累加偏移的新解析函数
function parseVIALayoutWithIndexOffset(layout: Row[]): SimpleKey[] {
  const keys: SimpleKey[] = [];
  let globalIndex = 0;
  let currentRowY = 0; // 跟踪当前行的起始Y位置

  for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
    const row = layout[rowIndex];
    let maxRowHeight = 1; // 当前行的最大高度
    let currentX = 0; // 当前行的X位置累加器
    let currentC = '#cccccc'; // 当前颜色
    let currentW = 1; // 当前宽度
    let currentH = 1; // 当前高度

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const item = row[colIndex];

      if (typeof item === 'object' && item !== null) {
        // 样式对象，更新当前属性（包括累加偏移）
        const style = item as ViaStyleObject;
        if (style.x !== undefined) currentX += style.x;
        if (style.y !== undefined) currentRowY += style.y;
        if (style.c !== undefined) currentC = style.c;
        if (style.w !== undefined) currentW = style.w;
        if (style.h !== undefined) currentH = style.h;

        // 如果有label，则这是一个按键对象
        if (style.label !== undefined) {
          const key: SimpleKey = {
            x: currentX,
            y: currentRowY,
            w: currentW,
            h: currentH,
            c: currentC,
            label: style.label,
            index: globalIndex
          };
          keys.push(key);
          maxRowHeight = Math.max(maxRowHeight, currentH);
          // 前进到下一个按键位置
          currentX += currentW;
          globalIndex++;
        }
      } else if (typeof item === 'string') {
        // 按键字符串，使用累积的X位置
        const parts = item.split('\n');
        const label = parts[1] || parts[0];
        const key: SimpleKey = {
          x: currentX,
          y: currentRowY,
          w: currentW,
          h: currentH,
          c: currentC,
          label,
          index: globalIndex
        };
        keys.push(key);
        maxRowHeight = Math.max(maxRowHeight, currentH);
        // 前进到下一个按键位置
        currentX += currentW;
        globalIndex++;
      }
    }

    // 更新下一行的起始Y位置
    currentRowY += maxRowHeight;
  }

  return keys;
}

// Hook to get window size
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateSize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    // Set initial size
    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

// Default QMK keycode mapping for common labels
const DEFAULT_KEYCODES: Record<string, string> = {
  'ESC': 'KC_ESC',
  '1': 'KC_1',
  '2': 'KC_2',
  '3': 'KC_3',
  '4': 'KC_4',
  '5': 'KC_5',
  '6': 'KC_6',
  '7': 'KC_7',
  '8': 'KC_8',
  '9': 'KC_9',
  '0': 'KC_0',
  '-': 'KC_MINS',
  '=': 'KC_EQL',
  'BKSP': 'KC_BSPC',
  'TAB': 'KC_TAB',
  'Q': 'KC_Q',
  'W': 'KC_W',
  'E': 'KC_E',
  'R': 'KC_R',
  'T': 'KC_T',
  'Y': 'KC_Y',
  'U': 'KC_U',
  'I': 'KC_I',
  'O': 'KC_O',
  'P': 'KC_P',
  '[': 'KC_LBRC',
  ']': 'KC_RBRC',
  '\\': 'KC_BSLS',
  'CAPS': 'KC_CAPS',
  'A': 'KC_A',
  'S': 'KC_S',
  'D': 'KC_D',
  'F': 'KC_F',
  'G': 'KC_G',
  'H': 'KC_H',
  'J': 'KC_J',
  'K': 'KC_K',
  'L': 'KC_L',
  ';': 'KC_SCLN',
  "'": 'KC_QUOT',
  'ENTER': 'KC_ENT',
  'LSHIFT': 'KC_LSFT',
  'Z': 'KC_Z',
  'X': 'KC_X',
  'C': 'KC_C',
  'V': 'KC_V',
  'B': 'KC_B',
  'N': 'KC_N',
  'M': 'KC_M',
  ',': 'KC_COMM',
  '.': 'KC_DOT',
  '/': 'KC_SLSH',
  'RSHIFT': 'KC_RSFT',
  'LCTRL': 'KC_LCTL',
  'LWIN': 'KC_LGUI',
  'LALT': 'KC_LALT',
  'SPACE': 'KC_SPC',
  'RALT': 'KC_RALT',
  'RWIN': 'KC_RGUI',
  'MENU': 'KC_APP',
  'RCTRL': 'KC_RCTL',
  'FN': 'MO(1)',
  'UP': 'KC_UP',
  'LEFT': 'KC_LEFT',
  'DOWN': 'KC_DOWN',
  'RIGHT': 'KC_RIGHT',
};

// 计算键盘边界框，参考VIA项目
function calculateKeyboardBounds(allKeys: Array<{ x: number; y: number; w: number; h: number }>) {
  const minX = Math.min(...allKeys.map(k => k.x));
  const minY = Math.min(...allKeys.map(k => k.y));
  const maxX = Math.max(...allKeys.map(k => k.x + k.w));
  const maxY = Math.max(...allKeys.map(k => k.y + k.h));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export default function KeyboardLayout({ layout, mapping, isViaLayout = false, onKeyClick, selectedKeyIndex }: Props) {
  if (isViaLayout) {
    return <VIAKeyboardLayout layout={layout} mapping={mapping} onKeyClick={onKeyClick} selectedKeyIndex={selectedKeyIndex} />;
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
              const desc = typeof k === 'string' ? { label: k, w: 1 } : typeof k === 'number' ? { label: k.toString(), w: 1 } : { label: k.label ?? '', w: k.w ?? 1 };
              const flex = Math.max(0.25, desc.w ?? 1);
              const globalIndex = rowStartIndex + c;
              const mapLabel = mapping?.[globalIndex] ?? '';
              const defaultKeycode = DEFAULT_KEYCODES[desc.label];
              const displayLabel = mapLabel || defaultKeycode || desc.label;
              const keyIndex = globalIndex;

              return (
                <div
                  key={c}
                  className="key-item flex flex-col items-center justify-center rounded border bg-gray-50 dark:bg-neutral-800"
                  style={{ flex: flex, minWidth: 28, padding: '6px 8px', height: '40px' }}
                >
                  <div className="text-xs font-medium">{displayLabel}</div>
                  {mapLabel && defaultKeycode && <div className="text-[10px] text-zinc-500 mt-1">{desc.label}</div>}
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

// VIA风格的按键组件，参考VIA项目优化
interface VIAKeycapProps {
  label: string;
  index: number;
  mapLabel?: string;
  defaultKeycode?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

function VIAKeycap({ label, index, mapLabel, defaultKeycode, x, y, w, h, color, isSelected, onClick }: VIAKeycapProps) {
  // 根据颜色获取样式，参考VIA项目
  const getKeyStyles = (color?: string) => {
    const baseStyles = {
      bgClass: 'bg-gradient-to-b from-gray-100 to-gray-200 dark:from-neutral-600 dark:to-neutral-700 border border-gray-300 dark:border-neutral-500',
      textColor: 'text-gray-800 dark:text-zinc-100',
      shadowClass: 'shadow-md shadow-gray-300/30 dark:shadow-neutral-900/30'
    };

    if (isSelected) {
      return {
        bgClass: 'bg-blue-500 dark:bg-blue-600 border border-blue-400',
        textColor: 'text-white',
        shadowClass: 'shadow-md shadow-blue-500/50 ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900'
      };
    }

    switch (color) {
      case '#cccccc':
        return {
          ...baseStyles,
          bgClass: 'bg-gradient-to-b from-gray-200 to-gray-300 dark:from-neutral-500 dark:to-neutral-600 border border-gray-400 dark:border-neutral-400'
        };
      case '#aaaaaa':
        return {
          ...baseStyles,
          bgClass: 'bg-gradient-to-b from-gray-300 to-gray-400 dark:from-neutral-400 dark:to-neutral-500 border border-gray-500 dark:border-neutral-300'
        };
      case '#777777':
        return {
          ...baseStyles,
          bgClass: 'bg-gradient-to-b from-gray-400 to-gray-500 dark:from-neutral-300 dark:to-neutral-400 border border-gray-600 dark:border-neutral-200',
          textColor: 'text-white dark:text-zinc-50'
        };
      default:
        return baseStyles;
    }
  };

  const styles = getKeyStyles(color);

  const displayLabel = mapLabel || defaultKeycode || label;

  return (
    <div
      className={`absolute flex flex-col items-center justify-center rounded-md ${styles.bgClass} ${styles.textColor} ${styles.shadowClass} hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer`}
      onClick={onClick}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        fontSize: w > 80 ? '14px' : w > 60 ? '12px' : '10px',
        padding: '2px 4px',
        boxSizing: 'border-box'
      }}
    >
      <div className="font-bold text-center leading-tight drop-shadow-sm truncate w-full">
        {displayLabel}
      </div>
      {mapLabel && defaultKeycode && (
        <div className="text-[8px] text-zinc-600 dark:text-zinc-300 mt-0.5 leading-tight opacity-80 truncate w-full">
          {label}
        </div>
      )}
      <div className="text-[7px] text-zinc-500 dark:text-zinc-400 mt-0.5 opacity-60">
        #{index}
      </div>
    </div>
  );
}

// 单个键盘按键组件
interface KeyProps {
  label: string;
  index: number;
  mapLabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  scale: number;
  offsetX: number;
  offsetY: number;
}

function KeyboardKey({ label, index, mapLabel, x, y, w, h, color, scale, offsetX, offsetY }: KeyProps) {
  const left = (x * scale) + offsetX;
  const top = (y * scale) + offsetY;
  const width = w * scale - 4;
  const height = h * scale - 4;

  // 根据颜色设置样式
  const getKeyStyles = (color?: string) => {
    const baseStyles = {
      bgClass: 'bg-gradient-to-b from-gray-100 to-gray-200 dark:from-neutral-600 dark:to-neutral-700 border-gray-300 dark:border-neutral-500',
      textColor: 'text-gray-800 dark:text-zinc-100',
      shadowClass: 'shadow-lg shadow-gray-300/50 dark:shadow-neutral-900/50'
    };

    switch (color) {
      case '#cccccc':
        return {
          ...baseStyles,
          bgClass: 'bg-gradient-to-b from-gray-200 to-gray-300 dark:from-neutral-500 dark:to-neutral-600 border-gray-400 dark:border-neutral-400'
        };
      case '#aaaaaa':
        return {
          ...baseStyles,
          bgClass: 'bg-gradient-to-b from-gray-300 to-gray-400 dark:from-neutral-400 dark:to-neutral-500 border-gray-500 dark:border-neutral-300'
        };
      case '#777777':
        return {
          ...baseStyles,
          bgClass: 'bg-gradient-to-b from-gray-400 to-gray-500 dark:from-neutral-300 dark:to-neutral-400 border-gray-600 dark:border-neutral-200',
          textColor: 'text-white dark:text-zinc-50'
        };
      default:
        return baseStyles;
    }
  };

  const styles = getKeyStyles(color);

  return (
    <div
      className={`absolute flex flex-col items-center justify-center rounded-lg border-2 ${styles.bgClass} ${styles.textColor} ${styles.shadowClass} hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        fontSize: w > 1.5 ? '12px' : '10px'
      }}
    >
      <div className="font-semibold text-center leading-tight drop-shadow-sm">{mapLabel || label}</div>
      {mapLabel && (
        <div className="text-[8px] text-zinc-600 dark:text-zinc-300 mt-1 leading-tight opacity-80">{label}</div>
      )}
      <div className="text-[7px] text-zinc-500 dark:text-zinc-400 mt-1 opacity-60">#{index}</div>
    </div>
  );
}

// 键盘容器组件
interface KeyboardContainerProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

function KeyboardContainer({ width, height, children }: KeyboardContainerProps) {
  return (
    <div className="keyboard-visual bg-gray-100 dark:bg-neutral-800 rounded border p-4" style={{ width, height }}>
      <div className="relative" style={{ width: width - 32, height: height - 32 }}>
        {children}
      </div>
    </div>
  );
}

// VIA格式键盘布局组件 - 屏幕一半高度布局，最小400px
function VIAKeyboardLayout({ layout, mapping, onKeyClick, selectedKeyIndex }: {
  layout: Row[] | VIAMap | VIAKey[][];
  mapping?: string[];
  onKeyClick?: (index: number) => void;
  selectedKeyIndex?: number | null;
}) {
  const windowSize = useWindowSize();
  const keyboardHeight = Math.max(windowSize.height / 2, 400);

  // 处理VIA布局：如果是VIAKey[][]格式，直接使用；否则解析
  const keys = useMemo(() => {
    // 检查是否已经是VIAKey[][]格式
    if (Array.isArray(layout) && layout.length > 0 && Array.isArray(layout[0]) && typeof layout[0][0] === 'object' && layout[0][0] !== null && 'row' in layout[0][0]) {
      // 已经是VIAKey[][]格式，直接展平
      return (layout as VIAKey[][]).flat().map((key, index) => ({
        ...key,
        index
      }));
    } else {
      // 使用新的基于索引累加偏移的解析函数
      return parseVIALayoutWithIndexOffset(layout as Row[]);
    }
  }, [layout]);

  // 计算键盘边界和固定比例渲染
  const layoutConfig = useMemo(() => {
    if (keys.length === 0) return { width: windowSize.width, height: keyboardHeight, scale: 1, offsetX: 0, offsetY: 0 };

    const maxX = Math.max(...keys.map(k => (k.x ?? 0) + (k.w ?? 1)));
    const maxY = Math.max(...keys.map(k => (k.y ?? 0) + (k.h ?? 1)));

    const naturalWidth = maxX * KEY_WIDTH;
    const naturalHeight = maxY * KEY_HEIGHT;

    // 使用固定缩放比例而不是适应容器
    const scale = 1; // 固定比例渲染

    // 居中水平对齐，顶部对齐垂直方向
    const offsetX = Math.max(0, (windowSize.width - naturalWidth) / 2);
    const offsetY = 20; // 固定20px顶部间距

    return {
      width: windowSize.width,
      height: keyboardHeight,
      scale,
      offsetX,
      offsetY,
      naturalWidth,
      naturalHeight
    };
  }, [keys, windowSize.width, keyboardHeight]);

  return (
    <div
      className="keyboard-visual bg-gray-100 dark:bg-neutral-800 overflow-hidden"
      style={{
        width: '100vw',
        height: `${keyboardHeight}px`,
        position: 'relative'
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          width: layoutConfig.width,
          height: layoutConfig.height
        }}
      >
        {keys.map((key) => {
          const pixelX = ((key.x ?? 0) * KEY_WIDTH) * layoutConfig.scale + layoutConfig.offsetX;
          const pixelY = ((key.y ?? 0) * KEY_HEIGHT) * layoutConfig.scale + layoutConfig.offsetY;
          const pixelW = (key.w ?? 1) * KEY_WIDTH * layoutConfig.scale;
          const pixelH = (key.h ?? 1) * KEY_HEIGHT * layoutConfig.scale;

          console.log(`Key ${key.index} (${key.label}) [row:${key.y ?? 0}, col:${key.x ?? 0}]: x=${pixelX}, y=${pixelY}`);

          const mapLabel = mapping?.[key.index];
          const defaultKeycode = DEFAULT_KEYCODES[key.label || ''];
          const displayLabel = mapLabel || defaultKeycode || key.label || '';

          return (
            <VIAKeycap
              key={key.index}
              label={key.label || ''}
              index={key.index}
              mapLabel={mapLabel}
              defaultKeycode={defaultKeycode}
              x={pixelX}
              y={pixelY}
              w={pixelW}
              h={pixelH}
              color={key.c}
              isSelected={selectedKeyIndex === key.index}
              onClick={() => onKeyClick?.(key.index)}
            />
          );
        })}
      </div>
    </div>
  );
}
