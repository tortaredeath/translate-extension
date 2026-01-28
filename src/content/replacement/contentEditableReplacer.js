/**
 * ContentEditable 元素文字替換
 */

import { log, logError } from '../config.js';
import { currentSelection } from '../state.js';
import { EditorTypes } from '../../shared/constants.js';
import { detectEditorType } from './editorDetector.js';
import { triggerContentEditableEvents, triggerSlackSync } from './eventTrigger.js';

/**
 * HTML 跳脫
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 替換 ContentEditable 元素的文字
 */
export function replaceContentEditableText(newText) {
  const range = currentSelection.range;
  const element = currentSelection.element;

  if (!range) {
    logError('無法取得選取範圍');
    return;
  }

  const editorType = detectEditorType(element);
  log('替換 ContentEditable 文字，編輯器類型:', editorType);

  // 確保焦點
  if (element) {
    element.focus();
  }

  // 恢復選取
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  // 根據編輯器類型選擇策略
  switch (editorType) {
    case EditorTypes.SLACK:
      replaceSlackText(newText, range, element, selection);
      break;
    case EditorTypes.NOTION:
    case EditorTypes.GMAIL:
    default:
      replaceGenericContentEditable(newText, range, element, selection);
  }
}

/**
 * Slack 專用文字替換
 */
function replaceSlackText(newText, range, element, selection) {
  log('使用 Slack 專用替換方法');

  // 方法 1: execCommand insertText
  try {
    selection.removeAllRanges();
    selection.addRange(range);

    const success = document.execCommand('insertText', false, newText);
    if (success) {
      log('Slack execCommand insertText 成功');
      triggerSlackSync(element);
      return;
    }
  } catch (e) {
    log('Slack execCommand insertText 失敗:', e);
  }

  // 方法 2: DOM 操作
  try {
    if (range.startContainer === range.endContainer &&
        range.startContainer.nodeType === Node.TEXT_NODE) {

      const textNode = range.startContainer;
      const before = textNode.textContent.substring(0, range.startOffset);
      const after = textNode.textContent.substring(range.endOffset);
      textNode.textContent = before + newText + after;

      const newRange = document.createRange();
      newRange.setStart(textNode, before.length + newText.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      log('單節點替換成功');
      triggerSlackSync(element);
      return;
    }
  } catch (e) {
    log('單節點替換失敗:', e);
  }

  // Fallback
  fallbackTextReplace(range, newText, element);
  triggerSlackSync(element);
}

/**
 * 通用 ContentEditable 替換
 */
function replaceGenericContentEditable(newText, range, element, selection) {
  log('使用通用 ContentEditable 替換方法');

  // 方法 1: execCommand insertText
  try {
    const success = document.execCommand('insertText', false, newText);
    if (success) {
      log('ContentEditable execCommand insertText 成功');
      triggerContentEditableEvents(element);
      return;
    }
  } catch (e) {
    log('execCommand insertText 失敗');
  }

  // 方法 2: Range API
  try {
    range.deleteContents();
    const textNode = document.createTextNode(newText);
    range.insertNode(textNode);

    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    triggerContentEditableEvents(element);
    log('Range API 替換完成');
  } catch (e) {
    logError('ContentEditable 替換失敗:', e);
    fallbackTextReplace(range, newText, element);
  }
}

/**
 * Fallback 純文字替換
 */
function fallbackTextReplace(range, newText, element) {
  try {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    range.deleteContents();
    const textNode = document.createTextNode(newText);
    range.insertNode(textNode);

    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    triggerContentEditableEvents(element);
    log('Fallback 純文字替換完成');
  } catch (e) {
    logError('Fallback 替換也失敗:', e);
  }
}
