/**
 * 元素類型偵測
 */

import { CONFIG } from '../config.js';

/**
 * 檢查是否為文字輸入元素
 */
export function isTextInputElement(element) {
  if (!element) return false;

  const tagName = element.tagName?.toLowerCase();

  // textarea
  if (tagName === 'textarea') return true;

  // input with supported types
  if (tagName === 'input') {
    const type = (element.type || 'text').toLowerCase();
    return CONFIG.supportedInputTypes.includes(type);
  }

  return false;
}

/**
 * 檢查是否為 contenteditable 元素
 */
export function isContentEditableElement(element) {
  if (!element) return false;

  // 直接的 contenteditable
  if (element.isContentEditable) return true;
  if (element.contentEditable === 'true') return true;

  // 檢查父元素（某些編輯器的子節點）
  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 10) {
    if (parent.isContentEditable || parent.contentEditable === 'true') {
      return true;
    }
    parent = parent.parentElement;
    depth++;
  }

  return false;
}

/**
 * 找到最近的可編輯祖先元素
 */
export function findEditableAncestor(element) {
  let current = element;
  let depth = 0;
  while (current && depth < 15) {
    if (current.isContentEditable || current.contentEditable === 'true') {
      return current;
    }
    if (isTextInputElement(current)) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }
  return null;
}

/**
 * 檢查文字是否包含中文
 */
export function containsChinese(text) {
  return CONFIG.chineseRegex.test(text);
}
