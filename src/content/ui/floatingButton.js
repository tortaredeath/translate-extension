/**
 * 浮動翻譯按鈕 UI
 */

import { log, logError } from '../config.js';
import { floatingButton, setFloatingButton } from '../state.js';

// 存儲點擊處理器
let clickHandler = null;

/**
 * 設置點擊處理器
 */
export function setButtonClickHandler(handler) {
  clickHandler = handler;
}

/**
 * 建立浮動按鈕
 */
export function createFloatingButton() {
  // 檢查是否已存在
  if (document.getElementById('translate-floating-btn')) {
    setFloatingButton(document.getElementById('translate-floating-btn'));
    return;
  }

  const btn = document.createElement('div');
  btn.id = 'translate-floating-btn';
  btn.className = 'translate-btn-hidden';
  btn.innerHTML = `
    <span class="translate-btn-text">譯</span>
    <span class="translate-btn-loading"></span>
  `;
  document.body.appendChild(btn);

  // 綁定事件
  btn.addEventListener('click', (e) => {
    if (clickHandler) {
      clickHandler(e);
    }
  });
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  setFloatingButton(btn);
}

/**
 * 顯示浮動按鈕（相對於元素）
 */
export function showFloatingButton(element) {
  const btn = floatingButton;
  if (!btn) return;

  const rect = element.getBoundingClientRect();

  let left = rect.right + window.scrollX - 70;
  let top = rect.top + window.scrollY - 45;

  // 邊界處理
  if (top < 10) {
    top = rect.bottom + window.scrollY + 5;
  }
  if (left + 80 > window.innerWidth) {
    left = window.innerWidth - 90;
  }
  left = Math.max(10, left);
  top = Math.max(10, top);

  btn.style.left = `${left}px`;
  btn.style.top = `${top}px`;
  btn.className = 'translate-btn-visible';
}

/**
 * 顯示浮動按鈕（相對於選取）
 */
export function showFloatingButtonAtSelection(selection) {
  const btn = floatingButton;
  if (!btn) return;

  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 如果無法取得有效的 rect，使用備選方案
    if (rect.width === 0 && rect.height === 0) {
      const activeElement = document.activeElement;
      if (activeElement) {
        showFloatingButton(activeElement);
        return;
      }
    }

    let left = rect.right + window.scrollX + 5;
    let top = rect.top + window.scrollY - 40;

    // 邊界處理
    if (top < 10) {
      top = rect.bottom + window.scrollY + 5;
    }
    if (left + 80 > window.innerWidth) {
      left = rect.left + window.scrollX - 80;
    }
    left = Math.max(10, left);
    top = Math.max(10, top);

    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    btn.className = 'translate-btn-visible';
  } catch (e) {
    logError('顯示按鈕失敗:', e);
  }
}

/**
 * 隱藏浮動按鈕
 */
export function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.className = 'translate-btn-hidden';
  }
}

/**
 * 設置載入狀態
 */
export function setButtonLoading(loading) {
  if (floatingButton) {
    if (loading) {
      floatingButton.classList.add('translate-btn-loading-state');
    } else {
      floatingButton.classList.remove('translate-btn-loading-state');
    }
  }
}

/**
 * 顯示錯誤狀態
 */
export function showButtonError(message) {
  if (!floatingButton) return;

  floatingButton.classList.add('translate-btn-error');
  floatingButton.querySelector('.translate-btn-text').textContent = message;

  setTimeout(() => {
    floatingButton.classList.remove('translate-btn-error');
    floatingButton.querySelector('.translate-btn-text').textContent = '譯';
    hideFloatingButton();
  }, 2000);
}

/**
 * 取得按鈕位置
 */
export function getButtonPosition() {
  if (!floatingButton) return null;
  const rect = floatingButton.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY
  };
}
