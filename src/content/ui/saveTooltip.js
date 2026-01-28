/**
 * 收藏提示 UI
 */

import { log, logError } from '../config.js';
import { saveTooltip, setSaveTooltip, lastTranslation } from '../state.js';
import { MessageActions } from '../../shared/constants.js';

/**
 * 建立收藏提示
 */
export function createSaveTooltip() {
  if (document.getElementById('translate-save-tooltip')) {
    setSaveTooltip(document.getElementById('translate-save-tooltip'));
    return;
  }

  const tooltip = document.createElement('div');
  tooltip.id = 'translate-save-tooltip';
  tooltip.className = 'translate-tooltip-hidden';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <span class="tooltip-text">✓ 已翻譯</span>
      <button class="tooltip-save-btn">+ 收藏</button>
    </div>
  `;
  document.body.appendChild(tooltip);

  // 綁定收藏按鈕事件
  const saveBtn = tooltip.querySelector('.tooltip-save-btn');
  saveBtn.addEventListener('click', handleSaveWord);
  saveBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  setSaveTooltip(tooltip);
}

/**
 * 顯示收藏提示
 */
export function showSaveTooltip(x, y) {
  const tooltip = saveTooltip;
  if (!tooltip) return;

  // 計算位置
  let left = x;
  let top = y - 50;

  // 邊界處理
  if (top < 10) {
    top = y + 20;
  }
  if (left + 150 > window.innerWidth) {
    left = window.innerWidth - 160;
  }
  left = Math.max(10, left);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.className = 'translate-tooltip-visible';

  // 3 秒後自動隱藏
  setTimeout(() => {
    hideSaveTooltip();
  }, 3000);
}

/**
 * 隱藏收藏提示
 */
export function hideSaveTooltip() {
  if (saveTooltip) {
    saveTooltip.className = 'translate-tooltip-hidden';
  }
}

/**
 * 處理收藏單字
 */
async function handleSaveWord(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!lastTranslation.original || !lastTranslation.translated) {
    log('沒有可收藏的翻譯');
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      action: MessageActions.ADD_VOCABULARY,
      word: {
        en: lastTranslation.translated,
        zh: lastTranslation.original,
        context: ''
      }
    });

    // 顯示成功
    const btn = saveTooltip.querySelector('.tooltip-save-btn');
    btn.textContent = '✓ 已收藏';
    btn.disabled = true;

    setTimeout(() => {
      hideSaveTooltip();
      btn.textContent = '+ 收藏';
      btn.disabled = false;
    }, 1000);

    log('單字已收藏:', lastTranslation.translated);
  } catch (error) {
    logError('收藏失敗:', error);
  }
}
