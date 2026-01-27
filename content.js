/**
 * 中英翻譯助手 - Content Script
 * 負責偵測文字選取、顯示浮動按鈕、替換翻譯後的文字
 */

(function () {
  'use strict';

  // 浮動按鈕元素
  let floatingButton = null;

  // 當前選取的資訊
  let currentSelection = {
    element: null,      // 選取所在的輸入元素
    start: 0,           // 選取起始位置
    end: 0,             // 選取結束位置
    text: '',           // 選取的文字
    isContentEditable: false  // 是否為 contenteditable 元素
  };

  /**
   * 初始化：建立浮動按鈕
   */
  function init() {
    createFloatingButton();
    setupEventListeners();
  }

  /**
   * 建立浮動翻譯按鈕
   */
  function createFloatingButton() {
    floatingButton = document.createElement('div');
    floatingButton.id = 'translate-floating-btn';
    floatingButton.className = 'translate-btn-hidden';
    floatingButton.innerHTML = `
      <span class="translate-btn-text">英文</span>
      <span class="translate-btn-loading"></span>
    `;
    document.body.appendChild(floatingButton);

    // 綁定點擊事件
    floatingButton.addEventListener('click', handleTranslateClick);
  }

  /**
   * 設定事件監聽器
   */
  function setupEventListeners() {
    // 監聽滑鼠放開事件（選取完成）
    document.addEventListener('mouseup', handleMouseUp);

    // 監聽鍵盤選取（Shift + 方向鍵）
    document.addEventListener('keyup', handleKeyUp);

    // 監聽點擊其他區域（隱藏按鈕）
    document.addEventListener('mousedown', handleMouseDown);

    // 監聽捲動（更新按鈕位置或隱藏）
    document.addEventListener('scroll', handleScroll, true);
  }

  /**
   * 處理滑鼠放開事件
   */
  function handleMouseUp(event) {
    // 如果點擊的是翻譯按鈕，不處理
    if (floatingButton && floatingButton.contains(event.target)) {
      return;
    }

    // 延遲檢查，確保選取已完成
    setTimeout(() => {
      checkSelection(event);
    }, 10);
  }

  /**
   * 處理鍵盤事件
   */
  function handleKeyUp(event) {
    // 只處理可能產生選取的按鍵
    if (event.shiftKey || event.key === 'Shift') {
      setTimeout(() => {
        checkSelection(event);
      }, 10);
    }
  }

  /**
   * 處理滑鼠按下事件
   */
  function handleMouseDown(event) {
    // 如果點擊的不是翻譯按鈕，隱藏按鈕
    if (floatingButton && !floatingButton.contains(event.target)) {
      hideFloatingButton();
    }
  }

  /**
   * 處理捲動事件
   */
  function handleScroll() {
    // 捲動時隱藏按鈕
    hideFloatingButton();
  }

  /**
   * 檢查文字選取
   */
  function checkSelection(event) {
    const activeElement = document.activeElement;

    // 檢查是否為輸入框
    if (isInputElement(activeElement)) {
      handleInputSelection(activeElement);
    } else if (isContentEditableElement(activeElement)) {
      handleContentEditableSelection(activeElement);
    } else {
      hideFloatingButton();
    }
  }

  /**
   * 檢查是否為輸入元素 (input 或 textarea)
   */
  function isInputElement(element) {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName === 'input') {
      const type = element.type.toLowerCase();
      return ['text', 'search', 'url', 'email', 'tel'].includes(type);
    }
    return false;
  }

  /**
   * 檢查是否為 contenteditable 元素
   */
  function isContentEditableElement(element) {
    if (!element) return false;
    return element.isContentEditable || element.contentEditable === 'true';
  }

  /**
   * 處理標準輸入框的選取
   */
  function handleInputSelection(element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;

    // 沒有選取文字
    if (start === end) {
      hideFloatingButton();
      return;
    }

    const selectedText = element.value.substring(start, end);

    // 檢查是否包含中文
    if (!containsChinese(selectedText)) {
      hideFloatingButton();
      return;
    }

    // 儲存選取資訊
    currentSelection = {
      element: element,
      start: start,
      end: end,
      text: selectedText,
      isContentEditable: false
    };

    // 顯示浮動按鈕
    showFloatingButton(element);
  }

  /**
   * 處理 contenteditable 元素的選取
   */
  function handleContentEditableSelection(element) {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      hideFloatingButton();
      return;
    }

    const selectedText = selection.toString();

    // 檢查是否包含中文
    if (!containsChinese(selectedText)) {
      hideFloatingButton();
      return;
    }

    // 儲存選取資訊
    currentSelection = {
      element: element,
      start: 0,
      end: 0,
      text: selectedText,
      isContentEditable: true,
      range: selection.getRangeAt(0).cloneRange()
    };

    // 顯示浮動按鈕
    showFloatingButtonAtSelection(selection);
  }

  /**
   * 檢查文字是否包含中文
   */
  function containsChinese(text) {
    // 匹配中文字元（包含繁體和簡體）
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
    return chineseRegex.test(text);
  }

  /**
   * 在輸入框旁邊顯示浮動按鈕
   */
  function showFloatingButton(element) {
    const rect = element.getBoundingClientRect();

    // 嘗試取得游標位置（較精確）
    let left, top;

    // 計算按鈕位置：在選取文字的右上方
    // 由於無法直接取得輸入框內選取文字的座標，使用輸入框右上角
    left = rect.right + window.scrollX - 60;
    top = rect.top + window.scrollY - 40;

    // 確保不超出視窗
    left = Math.max(10, Math.min(left, window.innerWidth - 70));
    top = Math.max(10, top);

    floatingButton.style.left = `${left}px`;
    floatingButton.style.top = `${top}px`;
    floatingButton.className = 'translate-btn-visible';
  }

  /**
   * 在選取文字位置顯示浮動按鈕（contenteditable）
   */
  function showFloatingButtonAtSelection(selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let left = rect.right + window.scrollX + 5;
    let top = rect.top + window.scrollY - 35;

    // 確保不超出視窗
    left = Math.max(10, Math.min(left, window.innerWidth - 70));
    top = Math.max(10, top);

    floatingButton.style.left = `${left}px`;
    floatingButton.style.top = `${top}px`;
    floatingButton.className = 'translate-btn-visible';
  }

  /**
   * 隱藏浮動按鈕
   */
  function hideFloatingButton() {
    if (floatingButton) {
      floatingButton.className = 'translate-btn-hidden';
    }
  }

  /**
   * 處理翻譯按鈕點擊
   */
  async function handleTranslateClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!currentSelection.text) {
      return;
    }

    // 顯示載入狀態
    floatingButton.classList.add('translate-btn-loading-state');

    try {
      // 發送翻譯請求到 background script
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: currentSelection.text,
        sourceLang: 'zh-TW',
        targetLang: 'en'
      });

      if (response.success) {
        // 替換文字
        replaceSelectedText(response.translatedText);
      } else {
        console.error('翻譯失敗:', response.error);
        showError('翻譯失敗，請稍後再試');
      }
    } catch (error) {
      console.error('翻譯錯誤:', error);
      showError('翻譯發生錯誤');
    } finally {
      // 隱藏按鈕和載入狀態
      floatingButton.classList.remove('translate-btn-loading-state');
      hideFloatingButton();
    }
  }

  /**
   * 替換選取的文字
   */
  function replaceSelectedText(newText) {
    if (currentSelection.isContentEditable) {
      replaceContentEditableText(newText);
    } else {
      replaceInputText(newText);
    }
  }

  /**
   * 替換輸入框中的文字
   */
  function replaceInputText(newText) {
    const element = currentSelection.element;
    const start = currentSelection.start;
    const end = currentSelection.end;

    // 取得原始值
    const originalValue = element.value;

    // 組合新值
    const newValue = originalValue.substring(0, start) + newText + originalValue.substring(end);

    // 更新值
    element.value = newValue;

    // 設定游標位置到替換文字的末尾
    const newCursorPos = start + newText.length;
    element.setSelectionRange(newCursorPos, newCursorPos);

    // 觸發 input 事件，確保 React/Vue 等框架能偵測到變更
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // 保持焦點
    element.focus();
  }

  /**
   * 替換 contenteditable 元素中的文字
   */
  function replaceContentEditableText(newText) {
    const range = currentSelection.range;

    if (!range) {
      console.error('無法取得選取範圍');
      return;
    }

    // 刪除選取的內容
    range.deleteContents();

    // 插入新文字
    const textNode = document.createTextNode(newText);
    range.insertNode(textNode);

    // 將游標移到新文字末尾
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);

    // 觸發 input 事件
    currentSelection.element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * 顯示錯誤訊息
   */
  function showError(message) {
    floatingButton.classList.add('translate-btn-error');
    floatingButton.querySelector('.translate-btn-text').textContent = message;

    setTimeout(() => {
      floatingButton.classList.remove('translate-btn-error');
      floatingButton.querySelector('.translate-btn-text').textContent = '英文';
      hideFloatingButton();
    }, 2000);
  }

  // 頁面載入完成後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
