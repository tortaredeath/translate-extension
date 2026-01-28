/**
 * 選取檢測
 */

import { log } from '../config.js';
import { setCurrentSelection } from '../state.js';
import {
  isTextInputElement,
  isContentEditableElement,
  findEditableAncestor,
  containsChinese
} from './elementDetector.js';
import {
  showFloatingButton,
  showFloatingButtonAtSelection,
  hideFloatingButton
} from '../ui/floatingButton.js';

/**
 * 檢查選取
 */
export function checkSelection() {
  const activeElement = document.activeElement;
  const selection = window.getSelection();

  log('檢查選取 - activeElement:', activeElement?.tagName,
      'selection:', selection?.toString()?.substring(0, 20));

  // 優先檢查標準輸入框
  if (isTextInputElement(activeElement)) {
    checkInputSelection(activeElement);
    return;
  }

  // 檢查 contenteditable
  if (isContentEditableElement(activeElement)) {
    checkContentEditableSelection(activeElement);
    return;
  }

  // 檢查一般選取（可能在 contenteditable 內）
  if (selection && !selection.isCollapsed && selection.toString().trim()) {
    const selectedText = selection.toString();

    // 檢查選取是否在可編輯區域內
    const anchorNode = selection.anchorNode;
    const editableAncestor = findEditableAncestor(
      anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode
    );

    if (editableAncestor && containsChinese(selectedText)) {
      log('在可編輯區域內偵測到選取:', selectedText.substring(0, 20));

      setCurrentSelection({
        element: editableAncestor,
        start: 0,
        end: 0,
        text: selectedText,
        type: isTextInputElement(editableAncestor) ? 'input' : 'contenteditable',
        range: selection.getRangeAt(0).cloneRange()
      });

      showFloatingButtonAtSelection(selection);
      return;
    }
  }

  hideFloatingButton();
}

/**
 * 檢查輸入框選取
 */
export function checkInputSelection(element) {
  const start = element.selectionStart;
  const end = element.selectionEnd;

  if (start === null || end === null || start === end) {
    hideFloatingButton();
    return;
  }

  const selectedText = element.value.substring(start, end);

  if (!containsChinese(selectedText)) {
    hideFloatingButton();
    return;
  }

  log('輸入框選取:', selectedText.substring(0, 20), '範圍:', start, '-', end);

  setCurrentSelection({
    element: element,
    start: start,
    end: end,
    text: selectedText,
    type: 'input',
    range: null
  });

  showFloatingButton(element);
}

/**
 * 檢查 ContentEditable 選取
 */
export function checkContentEditableSelection(element) {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed) {
    hideFloatingButton();
    return;
  }

  const selectedText = selection.toString();

  if (!containsChinese(selectedText)) {
    hideFloatingButton();
    return;
  }

  log('ContentEditable 選取:', selectedText.substring(0, 20));

  // 找到實際的 contenteditable 容器
  const editableElement = findEditableAncestor(element) || element;

  setCurrentSelection({
    element: editableElement,
    start: 0,
    end: 0,
    text: selectedText,
    type: 'contenteditable',
    range: selection.getRangeAt(0).cloneRange()
  });

  showFloatingButtonAtSelection(selection);
}
