/**
 * Content Script 狀態管理
 */

// UI 元素引用
export let floatingButton = null;
export let saveTooltip = null;

// 當前選取狀態
export let currentSelection = {
  element: null,
  start: 0,
  end: 0,
  text: '',
  type: 'unknown', // 'input' | 'contenteditable' | 'selection'
  range: null
};

// 最後翻譯結果
export let lastTranslation = {
  original: '',
  translated: ''
};

// 設置器
export function setFloatingButton(btn) {
  floatingButton = btn;
}

export function setSaveTooltip(tooltip) {
  saveTooltip = tooltip;
}

export function setCurrentSelection(selection) {
  currentSelection = { ...selection };
}

export function setLastTranslation(translation) {
  lastTranslation = { ...translation };
}

export function resetCurrentSelection() {
  currentSelection = {
    element: null,
    start: 0,
    end: 0,
    text: '',
    type: 'unknown',
    range: null
  };
}
