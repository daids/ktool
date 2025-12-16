"use client";

import React, { useState, useEffect } from 'react';

interface KeyMapping {
  index: number;
  originalLabel: string;
  currentMapping: string;
}

interface KeyCategory {
  name: string;
  keys: KeyMapping[];
}

interface KeyLayoutItem {
  label?: string;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  c?: string;
}

interface Props {
  keymapData: string[][];
  layoutData: (string | KeyLayoutItem)[][] | null;
  onKeymapChange: (newKeymap: string[][]) => void;
}

export default function KeyMappingTabs({ keymapData, layoutData, onKeymapChange }: Props) {
  const [activeTab, setActiveTab] = useState<string>('letters');

  // 解析布局数据，获取所有键的信息
  const categories = React.useMemo(() => {
    if (!layoutData || !keymapData.length) return [];

    const flattenedKeymap = keymapData.flat();
    const allKeys: KeyMapping[] = [];

    // 解析VIA布局获取键信息
    let globalIndex = 0;
    for (let rowIndex = 0; rowIndex < layoutData.length; rowIndex++) {
      const row = layoutData[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const key = row[colIndex];

        if (typeof key === 'object' && key !== null) {
          const styleObj = key as KeyLayoutItem;
          if (styleObj.w !== undefined || styleObj.h !== undefined) {
            const label = styleObj.label || `Key ${globalIndex}`;
            const mapping = flattenedKeymap[globalIndex] || 'KC_NO';
            allKeys.push({
              index: globalIndex,
              originalLabel: label,
              currentMapping: mapping
            });
            globalIndex++;
          }
        } else if (typeof key === 'string') {
          const parts = key.split('\n');
          const label = parts.length > 1 ? parts[1] : `Key ${globalIndex}`;
          const mapping = flattenedKeymap[globalIndex] || 'KC_NO';
          allKeys.push({
            index: globalIndex,
            originalLabel: label,
            currentMapping: mapping
          });
          globalIndex++;
        }
      }
    }

    // 按功能分类键
    const categorizedKeys: KeyCategory[] = [
      {
        name: 'letters',
        keys: allKeys.filter(k => /^[A-Z]$/.test(k.originalLabel) || /^KC_[A-Z]$/.test(k.currentMapping))
      },
      {
        name: 'numbers',
        keys: allKeys.filter(k => /^\d$/.test(k.originalLabel) || /^KC_\d$/.test(k.currentMapping))
      },
      {
        name: 'modifiers',
        keys: allKeys.filter(k =>
          ['LSFT', 'RSFT', 'LCTL', 'RCTL', 'LALT', 'RALT', 'LGUI', 'RGUI'].some(mod =>
            k.originalLabel.includes(mod) || k.currentMapping.includes(mod)
          ) ||
          ['SHIFT', 'CTRL', 'ALT', 'GUI', 'CMD'].some(mod =>
            k.originalLabel.includes(mod) || k.currentMapping.includes(mod)
          )
        )
      },
      {
        name: 'function',
        keys: allKeys.filter(k =>
          /^F\d+$/.test(k.originalLabel) || /^KC_F\d+$/.test(k.currentMapping)
        )
      },
      {
        name: 'special',
        keys: allKeys.filter(k =>
          ['ESC', 'TAB', 'ENTER', 'SPACE', 'BSPC', 'DEL', 'CAPS'].some(special =>
            k.originalLabel.includes(special) || k.currentMapping.includes(special)
          )
        )
      },
      {
        name: 'navigation',
        keys: allKeys.filter(k =>
          ['UP', 'DOWN', 'LEFT', 'RIGHT', 'HOME', 'END', 'PGUP', 'PGDN'].some(nav =>
            k.originalLabel.includes(nav) || k.currentMapping.includes(nav)
          )
        )
      },
      {
        name: 'media',
        keys: allKeys.filter(k =>
          ['VOL', 'MUTE', 'PLAY', 'PAUSE', 'NEXT', 'PREV'].some(media =>
            k.originalLabel.includes(media) || k.currentMapping.includes(media)
          )
        )
      },
      {
        name: 'custom',
        keys: allKeys.filter(k =>
          !allKeys.some(other =>
            (['letters', 'numbers', 'modifiers', 'function', 'special', 'navigation', 'media'] as const).some(catName => {
              const catKeys = categorizedKeys.find(c => c.name === catName)?.keys || [];
              return catKeys.some(ck => ck.index === k.index);
            })
          )
        )
      }
    ];

    return categorizedKeys;
  }, [keymapData, layoutData]);

  const updateKeyMapping = (keyIndex: number, newMapping: string) => {
    const flattened = keymapData.flat();
    flattened[keyIndex] = newMapping;

    // 重新构造二维数组
    const newKeymap: string[][] = [];
    let currentRow: string[] = [];
    let keyCount = 0;

    for (const row of layoutData || []) {
      currentRow = [];
      for (const key of row) {
        if (typeof key === 'object' && key !== null && (key.w !== undefined || key.h !== undefined)) {
          currentRow.push(flattened[keyCount] || 'KC_NO');
          keyCount++;
        } else if (typeof key === 'string') {
          currentRow.push(flattened[keyCount] || 'KC_NO');
          keyCount++;
        }
      }
      if (currentRow.length > 0) {
        newKeymap.push(currentRow);
      }
    }

    onKeymapChange(newKeymap);
  };

  const tabLabels = {
    letters: '字母键',
    numbers: '数字键',
    modifiers: '修饰键',
    function: '功能键',
    special: '特殊键',
    navigation: '导航键',
    media: '媒体键',
    custom: '自定义'
  };

  const activeCategory = categories.find(cat => cat.name === activeTab);

  return (
    <div className="w-full">
      {/* Tab 导航 */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {Object.entries(tabLabels).map(([key, label]) => {
          const category = categories.find(cat => cat.name === key);
          const hasKeys = category && category.keys.length > 0;
          if (!hasKeys) return null;

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-zinc-50 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {label} ({category.keys.length})
            </button>
          );
        })}
      </div>

      {/* Tab 内容 */}
      <div className="min-h-[300px]">
        {activeCategory ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeCategory.keys.map(key => (
              <div key={key.index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {key.originalLabel} (#{key.index})
                </div>
                <input
                  type="text"
                  value={key.currentMapping}
                  onChange={(e) => updateKeyMapping(key.index, e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-zinc-50"
                  placeholder="KC_NO"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            暂无按键数据
          </div>
        )}
      </div>
    </div>
  );
}
