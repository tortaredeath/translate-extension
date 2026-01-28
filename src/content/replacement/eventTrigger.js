/**
 * 事件觸發器 - 讓框架同步狀態
 */

import { log } from '../config.js';

/**
 * 觸發輸入事件（讓 React/Vue/Angular 同步狀態）
 */
export function triggerInputEvents(element, data) {
  // InputEvent (React 16+, Vue 3+)
  try {
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: data,
      composed: true
    });
    element.dispatchEvent(inputEvent);
  } catch (e) {
    // 舊版瀏覽器備選
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 其他事件
  element.dispatchEvent(new Event('change', { bubbles: true }));

  // KeyboardEvent (某些框架需要)
  element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    key: 'Unidentified',
    composed: true
  }));
  element.dispatchEvent(new KeyboardEvent('keyup', {
    bubbles: true,
    key: 'Unidentified',
    composed: true
  }));

  // 對於 Vue，可能需要額外的 compositionend
  element.dispatchEvent(new CompositionEvent('compositionend', {
    bubbles: true,
    data: data
  }));
}

/**
 * 觸發 ContentEditable 相關事件
 */
export function triggerContentEditableEvents(element) {
  if (!element) return;

  // input 事件
  element.dispatchEvent(new Event('input', {
    bubbles: true,
    cancelable: true,
    composed: true
  }));

  // 對於使用 MutationObserver 的編輯器
  element.dispatchEvent(new Event('DOMSubtreeModified', { bubbles: true }));

  // 對於 Draft.js / Slate.js
  element.dispatchEvent(new Event('beforeinput', {
    bubbles: true,
    cancelable: true
  }));
}

/**
 * 觸發 Slack 編輯器同步
 */
export function triggerSlackSync(element) {
  if (!element) return;

  // 找到正確的編輯器容器
  const editor = element.closest('[data-qa="message_input"]') ||
                 element.closest('.ql-editor') ||
                 element.closest('[contenteditable="true"]') ||
                 element;

  // InputEvent
  try {
    editor.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      composed: true
    }));
  } catch (e) {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Change 事件
  editor.dispatchEvent(new Event('change', { bubbles: true }));

  // Quill 專用事件
  editor.dispatchEvent(new CustomEvent('text-change', {
    bubbles: true,
    detail: { source: 'user' }
  }));

  // 模擬編輯完成
  editor.dispatchEvent(new Event('blur', { bubbles: true }));
  setTimeout(() => {
    editor.focus();
  }, 10);

  // MutationObserver 觸發
  try {
    const dummy = document.createComment('');
    editor.appendChild(dummy);
    dummy.remove();
  } catch (e) {
    // ignore
  }

  // React 相關事件
  editor.dispatchEvent(new CustomEvent('react-dom-input', { bubbles: true }));

  // Draft.js
  editor.dispatchEvent(new Event('beforeinput', {
    bubbles: true,
    cancelable: true
  }));

  log('Slack 同步事件已觸發');
}
