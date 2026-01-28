/**
 * 中英翻譯助手 - Content Script v2.0.2
 * 模組化重構版本
 */

import { CONFIG, log } from './config.js';
import { floatingButton } from './state.js';
import { createFloatingButton, hideFloatingButton, setButtonClickHandler } from './ui/floatingButton.js';
import { createSaveTooltip } from './ui/saveTooltip.js';
import { checkSelection, checkInputSelection } from './selection/selectionChecker.js';
import { isTextInputElement } from './selection/elementDetector.js';
import { handleTranslateClick } from './translator.js';

// 避免重複初始化
if (window.__translateHelperInitialized) {
  // 已初始化，跳過
} else {
  window.__translateHelperInitialized = true;

  // 初始化
  function init() {
    log('初始化中... (frame:', window.location.href.substring(0, 50), ')');
    createFloatingButton();
    setButtonClickHandler(handleTranslateClick);
    createSaveTooltip();
    setupEventListeners();
    log('初始化完成！');
  }

  // 事件監聽設置
  function setupEventListeners() {
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('focusin', handleFocusIn, true);
  }

  function handleMouseUp(event) {
    if (floatingButton && floatingButton.contains(event.target)) {
      return;
    }
    setTimeout(() => checkSelection(), CONFIG.selectionDelay);
  }

  function handleKeyUp(event) {
    if (event.shiftKey || event.key === 'Shift' ||
        (event.ctrlKey && event.key === 'a') ||
        (event.metaKey && event.key === 'a')) {
      setTimeout(() => checkSelection(), CONFIG.selectionDelay);
    }
  }

  function handleMouseDown(event) {
    if (floatingButton && !floatingButton.contains(event.target)) {
      hideFloatingButton();
    }
  }

  function handleScroll() {
    hideFloatingButton();
  }

  function handleSelectionChange() {
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (isTextInputElement(activeElement)) {
        checkInputSelection(activeElement);
      }
    }, CONFIG.selectionDelay);
  }

  function handleFocusIn(event) {
    log('FocusIn:', event.target.tagName);
  }

  // 啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
