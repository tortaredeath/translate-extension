/**
 * 標準輸入框文字替換
 */

import { log, logError } from '../config.js';
import { currentSelection } from '../state.js';
import { triggerInputEvents } from './eventTrigger.js';

/**
 * 替換標準輸入框的文字
 * 支援 React、Vue、Angular 等框架
 */
export function replaceInputText(newText) {
  const element = currentSelection.element;
  const start = currentSelection.start;
  const end = currentSelection.end;

  if (!element) {
    logError('找不到輸入元素');
    return;
  }

  log('替換輸入框文字:', element.tagName, 'type:', element.type);

  // 確保焦點
  element.focus();

  // 方法 1: execCommand (最佳相容性)
  try {
    element.setSelectionRange(start, end);
    const success = document.execCommand('insertText', false, newText);
    if (success) {
      log('execCommand 成功');
      triggerInputEvents(element, newText);
      return;
    }
  } catch (e) {
    log('execCommand 不支援，嘗試其他方法');
  }

  // 方法 2: 原生 setter (React 相容)
  const originalValue = element.value;
  const newValue = originalValue.substring(0, start) + newText + originalValue.substring(end);

  // 使用原生 setter 繞過框架攔截
  const descriptor = Object.getOwnPropertyDescriptor(
    element.tagName.toLowerCase() === 'textarea'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    'value'
  );

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, newValue);
  } else {
    element.value = newValue;
  }

  // 設定游標位置
  const newCursorPos = start + newText.length;
  element.setSelectionRange(newCursorPos, newCursorPos);

  // 觸發事件
  triggerInputEvents(element, newText);

  log('原生 setter 替換完成');
}
