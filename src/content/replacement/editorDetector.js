/**
 * 編輯器類型偵測
 */

import { EditorTypes } from '../../shared/constants.js';

/**
 * 偵測編輯器類型
 */
export function detectEditorType(element) {
  if (!element) return EditorTypes.GENERIC;

  if (isSlackEditor(element)) return EditorTypes.SLACK;
  if (isNotionEditor(element)) return EditorTypes.NOTION;
  if (isGmailEditor(element)) return EditorTypes.GMAIL;

  return EditorTypes.GENERIC;
}

/**
 * 檢查是否為 Slack 編輯器
 */
export function isSlackEditor(element) {
  if (element.closest('[data-qa="message_input"]')) return true;
  if (element.closest('.ql-editor')) return true;
  if (element.closest('[data-message-input]')) return true;
  if (element.classList?.contains('ql-editor')) return true;
  if (window.location.hostname.includes('slack.com')) return true;

  let parent = element;
  let depth = 0;
  while (parent && depth < 10) {
    if (parent.classList?.contains('ql-container') ||
        parent.classList?.contains('ql-editor') ||
        parent.getAttribute?.('data-qa')?.includes('message')) {
      return true;
    }
    parent = parent.parentElement;
    depth++;
  }

  return false;
}

/**
 * 檢查是否為 Notion 編輯器
 */
export function isNotionEditor(element) {
  if (window.location.hostname.includes('notion.so')) return true;
  if (element.closest('[data-content-editable-leaf]')) return true;
  if (element.closest('.notion-page-content')) return true;
  return false;
}

/**
 * 檢查是否為 Gmail 編輯器
 */
export function isGmailEditor(element) {
  if (window.location.hostname.includes('mail.google.com')) return true;
  if (element.closest('[role="textbox"][aria-label*="Message"]')) return true;
  if (element.closest('.Am.Al.editable')) return true;
  return false;
}
