"use client";

import React, { useState, useEffect } from 'react';

interface KeyMapping {
  index: number;
  originalLabel: string;
  currentMapping: string;
}

interface MappingOption {
  label: string;
  value: string;
  category: string;
  description?: string;
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

  // 预定义的映射选项
  const mappingOptions: MappingOption[] = [
    // 字母键
    { label: 'A', value: 'KC_A', category: 'letters', description: '字母 A' },
    { label: 'B', value: 'KC_B', category: 'letters', description: '字母 B' },
    { label: 'C', value: 'KC_C', category: 'letters', description: '字母 C' },
    { label: 'D', value: 'KC_D', category: 'letters', description: '字母 D' },
    { label: 'E', value: 'KC_E', category: 'letters', description: '字母 E' },
    { label: 'F', value: 'KC_F', category: 'letters', description: '字母 F' },
    { label: 'G', value: 'KC_G', category: 'letters', description: '字母 G' },
    { label: 'H', value: 'KC_H', category: 'letters', description: '字母 H' },
    { label: 'I', value: 'KC_I', category: 'letters', description: '字母 I' },
    { label: 'J', value: 'KC_J', category: 'letters', description: '字母 J' },
    { label: 'K', value: 'KC_K', category: 'letters', description: '字母 K' },
    { label: 'L', value: 'KC_L', category: 'letters', description: '字母 L' },
    { label: 'M', value: 'KC_M', category: 'letters', description: '字母 M' },
    { label: 'N', value: 'KC_N', category: 'letters', description: '字母 N' },
    { label: 'O', value: 'KC_O', category: 'letters', description: '字母 O' },
    { label: 'P', value: 'KC_P', category: 'letters', description: '字母 P' },
    { label: 'Q', value: 'KC_Q', category: 'letters', description: '字母 Q' },
    { label: 'R', value: 'KC_R', category: 'letters', description: '字母 R' },
    { label: 'S', value: 'KC_S', category: 'letters', description: '字母 S' },
    { label: 'T', value: 'KC_T', category: 'letters', description: '字母 T' },
    { label: 'U', value: 'KC_U', category: 'letters', description: '字母 U' },
    { label: 'V', value: 'KC_V', category: 'letters', description: '字母 V' },
    { label: 'W', value: 'KC_W', category: 'letters', description: '字母 W' },
    { label: 'X', value: 'KC_X', category: 'letters', description: '字母 X' },
    { label: 'Y', value: 'KC_Y', category: 'letters', description: '字母 Y' },
    { label: 'Z', value: 'KC_Z', category: 'letters', description: '字母 Z' },

    // 数字键
    { label: '0', value: 'KC_0', category: 'numbers', description: '数字 0' },
    { label: '1', value: 'KC_1', category: 'numbers', description: '数字 1' },
    { label: '2', value: 'KC_2', category: 'numbers', description: '数字 2' },
    { label: '3', value: 'KC_3', category: 'numbers', description: '数字 3' },
    { label: '4', value: 'KC_4', category: 'numbers', description: '数字 4' },
    { label: '5', value: 'KC_5', category: 'numbers', description: '数字 5' },
    { label: '6', value: 'KC_6', category: 'numbers', description: '数字 6' },
    { label: '7', value: 'KC_7', category: 'numbers', description: '数字 7' },
    { label: '8', value: 'KC_8', category: 'numbers', description: '数字 8' },
    { label: '9', value: 'KC_9', category: 'numbers', description: '数字 9' },

    // 修饰键
    { label: '左Ctrl', value: 'KC_LCTL', category: 'modifiers', description: '左控制键' },
    { label: '右Ctrl', value: 'KC_RCTL', category: 'modifiers', description: '右控制键' },
    { label: '左Shift', value: 'KC_LSFT', category: 'modifiers', description: '左Shift键' },
    { label: '右Shift', value: 'KC_RSFT', category: 'modifiers', description: '右Shift键' },
    { label: '左Alt', value: 'KC_LALT', category: 'modifiers', description: '左Alt键' },
    { label: '右Alt', value: 'KC_RALT', category: 'modifiers', description: '右Alt键' },
    { label: '左GUI', value: 'KC_LGUI', category: 'modifiers', description: '左Windows/Cmd键' },
    { label: '右GUI', value: 'KC_RGUI', category: 'modifiers', description: '右Windows/Cmd键' },

    // 功能键
    { label: 'F1', value: 'KC_F1', category: 'function', description: '功能键 F1' },
    { label: 'F2', value: 'KC_F2', category: 'function', description: '功能键 F2' },
    { label: 'F3', value: 'KC_F3', category: 'function', description: '功能键 F3' },
    { label: 'F4', value: 'KC_F4', category: 'function', description: '功能键 F4' },
    { label: 'F5', value: 'KC_F5', category: 'function', description: '功能键 F5' },
    { label: 'F6', value: 'KC_F6', category: 'function', description: '功能键 F6' },
    { label: 'F7', value: 'KC_F7', category: 'function', description: '功能键 F7' },
    { label: 'F8', value: 'KC_F8', category: 'function', description: '功能键 F8' },
    { label: 'F9', value: 'KC_F9', category: 'function', description: '功能键 F9' },
    { label: 'F10', value: 'KC_F10', category: 'function', description: '功能键 F10' },
    { label: 'F11', value: 'KC_F11', category: 'function', description: '功能键 F11' },
    { label: 'F12', value: 'KC_F12', category: 'function', description: '功能键 F12' },

    // 特殊键
    { label: 'Esc', value: 'KC_ESC', category: 'special', description: '退出键' },
    { label: 'Tab', value: 'KC_TAB', category: 'special', description: '制表键' },
    { label: 'Enter', value: 'KC_ENT', category: 'special', description: '回车键' },
    { label: 'Space', value: 'KC_SPC', category: 'special', description: '空格键' },
    { label: 'Backspace', value: 'KC_BSPC', category: 'special', description: '退格键' },
    { label: 'Delete', value: 'KC_DEL', category: 'special', description: '删除键' },
    { label: 'Caps Lock', value: 'KC_CAPS', category: 'special', description: '大写锁定' },

    // 导航键
    { label: '↑', value: 'KC_UP', category: 'navigation', description: '上箭头' },
    { label: '↓', value: 'KC_DOWN', category: 'navigation', description: '下箭头' },
    { label: '←', value: 'KC_LEFT', category: 'navigation', description: '左箭头' },
    { label: '→', value: 'KC_RGHT', category: 'navigation', description: '右箭头' },
    { label: 'Home', value: 'KC_HOME', category: 'navigation', description: '行首' },
    { label: 'End', value: 'KC_END', category: 'navigation', description: '行尾' },
    { label: 'Page Up', value: 'KC_PGUP', category: 'navigation', description: '上翻页' },
    { label: 'Page Down', value: 'KC_PGDN', category: 'navigation', description: '下翻页' },

    // 媒体键
    { label: '音量+', value: 'KC_VOLU', category: 'media', description: '音量增加' },
    { label: '音量-', value: 'KC_VOLD', category: 'media', description: '音量减少' },
    { label: '静音', value: 'KC_MUTE', category: 'media', description: '静音' },
    { label: '播放/暂停', value: 'KC_MPLY', category: 'media', description: '播放暂停' },
    { label: '下一首', value: 'KC_MNXT', category: 'media', description: '下一首' },
    { label: '上一首', value: 'KC_MPRV', category: 'media', description: '上一首' },

    // 其他常用键
    { label: '无操作', value: 'KC_NO', category: 'special', description: '无操作' },
    { label: '透明', value: 'KC_TRNS', category: 'special', description: '透明键（用于层）' },
  ];

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
      <div className="h-[300px] overflow-y-auto">
        {activeCategory ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeCategory.keys.map(key => {
              // 获取当前分类的映射选项
              const categoryOptions = mappingOptions.filter(option => option.category === activeTab);

              return (
                <div key={key.index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {key.originalLabel} (#{key.index})
                  </div>
                  <select
                    value={key.currentMapping}
                    onChange={(e) => updateKeyMapping(key.index, e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-zinc-50"
                  >
                    {/* 当前映射（如果不在预定义选项中） */}
                    {!categoryOptions.some(option => option.value === key.currentMapping) && (
                      <option value={key.currentMapping}>{key.currentMapping}</option>
                    )}
                    {/* 预定义选项 */}
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value} title={option.description}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                    {/* 其他分类的常用选项 */}
                    {mappingOptions
                      .filter(option => option.category !== activeTab)
                      .slice(0, 10) // 限制数量，避免下拉菜单过长
                      .map(option => (
                        <option key={option.value} value={option.value} title={option.description}>
                          {option.label} ({option.value})
                        </option>
                      ))
                    }
                  </select>
                  {/* 显示当前映射的描述 */}
                  {(() => {
                    const currentOption = mappingOptions.find(option => option.value === key.currentMapping);
                    return currentOption?.description ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {currentOption.description}
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })}
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
