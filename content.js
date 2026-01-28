/**
 * 中英翻譯助手 - Content Script v2.0.2
 * 支援：
 * - HTML 原生輸入元素 (input, textarea)
 * - ContentEditable 元素 (Gmail, Notion, Slack, Medium 等)
 * - React/Vue/Angular 框架
 * - iframe 內嵌編輯器
 * - 完整格式保留：粗體、斜體、底線、刪除線、程式碼、連結、顏色
 * - Slack 專用優化（Quill 編輯器）
 * - 行內程式碼區塊完整保留（不翻譯 code 元素內容）
 * - 翻譯統計功能
 * - 單字本收藏功能
 */

(function () {
  'use strict';

  // 避免重複初始化
  if (window.__translateHelperInitialized) {
    return;
  }
  window.__translateHelperInitialized = true;

  // ==================== 配置 ====================
  const CONFIG = {
    // 支援的 input types
    supportedInputTypes: ['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''],
    // 中文檢測正則
    chineseRegex: /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/,
    // 按鈕顯示延遲
    selectionDelay: 30,
    // 除錯模式
    debug: true
  };

  // ==================== 工具函數 ====================
  function log(...args) {
    if (CONFIG.debug) {
      console.log('[翻譯助手]', ...args);
    }
  }

  function logError(...args) {
    console.error('[翻譯助手]', ...args);
  }

  // ==================== 狀態管理 ====================
  let floatingButton = null;
  let saveTooltip = null;
  let currentSelection = {
    element: null,
    start: 0,
    end: 0,
    text: '',
    type: 'unknown', // 'input' | 'contenteditable' | 'selection'
    range: null
  };
  let lastTranslation = {
    original: '',
    translated: ''
  };

  // ==================== 初始化 ====================
  function init() {
    log('初始化中... (frame:', window.location.href.substring(0, 50), ')');
    createFloatingButton();
    createSaveTooltip();
    setupEventListeners();
    log('初始化完成！');
  }

  // ==================== 建立浮動按鈕 ====================
  function createFloatingButton() {
    // 檢查是否已存在
    if (document.getElementById('translate-floating-btn')) {
      floatingButton = document.getElementById('translate-floating-btn');
      return;
    }

    floatingButton = document.createElement('div');
    floatingButton.id = 'translate-floating-btn';
    floatingButton.className = 'translate-btn-hidden';
    floatingButton.innerHTML = `
      <span class="translate-btn-text">譯</span>
      <span class="translate-btn-loading"></span>
    `;
    document.body.appendChild(floatingButton);

    // 綁定事件
    floatingButton.addEventListener('click', handleTranslateClick);
    floatingButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // ==================== 建立收藏提示 ====================
  function createSaveTooltip() {
    if (document.getElementById('translate-save-tooltip')) {
      saveTooltip = document.getElementById('translate-save-tooltip');
      return;
    }

    saveTooltip = document.createElement('div');
    saveTooltip.id = 'translate-save-tooltip';
    saveTooltip.className = 'translate-tooltip-hidden';
    saveTooltip.innerHTML = `
      <div class="tooltip-content">
        <span class="tooltip-text">✓ 已翻譯</span>
        <button class="tooltip-save-btn">+ 收藏</button>
      </div>
    `;
    document.body.appendChild(saveTooltip);

    // 綁定收藏按鈕事件
    const saveBtn = saveTooltip.querySelector('.tooltip-save-btn');
    saveBtn.addEventListener('click', handleSaveWord);
    saveBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  function showSaveTooltip(x, y) {
    if (!saveTooltip) return;

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

    saveTooltip.style.left = `${left}px`;
    saveTooltip.style.top = `${top}px`;
    saveTooltip.className = 'translate-tooltip-visible';

    // 3 秒後自動隱藏
    setTimeout(() => {
      hideSaveTooltip();
    }, 3000);
  }

  function hideSaveTooltip() {
    if (saveTooltip) {
      saveTooltip.className = 'translate-tooltip-hidden';
    }
  }

  async function handleSaveWord(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!lastTranslation.original || !lastTranslation.translated) {
      log('沒有可收藏的翻譯');
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'addVocabulary',
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

  // ==================== 事件監聽 ====================
  function setupEventListeners() {
    // 滑鼠放開（選取完成）
    document.addEventListener('mouseup', handleMouseUp, true);

    // 鍵盤選取
    document.addEventListener('keyup', handleKeyUp, true);

    // 點擊其他區域
    document.addEventListener('mousedown', handleMouseDown, true);

    // 捲動
    document.addEventListener('scroll', handleScroll, true);

    // Selection 變化
    document.addEventListener('selectionchange', handleSelectionChange);

    // 監聽 focus 事件以處理動態載入的輸入框
    document.addEventListener('focusin', handleFocusIn, true);
  }

  function handleMouseUp(event) {
    if (floatingButton && floatingButton.contains(event.target)) {
      return;
    }
    setTimeout(() => checkSelection(), CONFIG.selectionDelay);
  }

  function handleKeyUp(event) {
    // Shift 選取、Ctrl+A 全選
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
    // 當新的輸入框獲得焦點時，重置選取
    log('FocusIn:', event.target.tagName);
  }

  // ==================== 元素類型判斷 ====================

  /**
   * 檢查是否為文字輸入元素
   */
  function isTextInputElement(element) {
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
  function isContentEditableElement(element) {
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
  function findEditableAncestor(element) {
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

  // ==================== 選取檢測 ====================

  function checkSelection() {
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

        currentSelection = {
          element: editableAncestor,
          start: 0,
          end: 0,
          text: selectedText,
          type: isTextInputElement(editableAncestor) ? 'input' : 'contenteditable',
          range: selection.getRangeAt(0).cloneRange()
        };

        showFloatingButtonAtSelection(selection);
        return;
      }
    }

    hideFloatingButton();
  }

  function checkInputSelection(element) {
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

    currentSelection = {
      element: element,
      start: start,
      end: end,
      text: selectedText,
      type: 'input',
      range: null
    };

    showFloatingButton(element);
  }

  function checkContentEditableSelection(element) {
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

    currentSelection = {
      element: editableElement,
      start: 0,
      end: 0,
      text: selectedText,
      type: 'contenteditable',
      range: selection.getRangeAt(0).cloneRange()
    };

    showFloatingButtonAtSelection(selection);
  }

  function containsChinese(text) {
    return CONFIG.chineseRegex.test(text);
  }

  // ==================== 浮動按鈕顯示 ====================

  function showFloatingButton(element) {
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

    floatingButton.style.left = `${left}px`;
    floatingButton.style.top = `${top}px`;
    floatingButton.className = 'translate-btn-visible';
  }

  function showFloatingButtonAtSelection(selection) {
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

      floatingButton.style.left = `${left}px`;
      floatingButton.style.top = `${top}px`;
      floatingButton.className = 'translate-btn-visible';
    } catch (e) {
      logError('顯示按鈕失敗:', e);
    }
  }

  function hideFloatingButton() {
    if (floatingButton) {
      floatingButton.className = 'translate-btn-hidden';
    }
  }

  // ==================== 翻譯處理 ====================

  /**
   * 從文字中提取需要翻譯的部分，保留 emoji、符號、URL 等
   * 返回：{ segments: [{type: 'text'|'preserve', content: string}], textToTranslate: string, lines: string[] }
   *
   * 策略：
   * 1. 先按行分割
   * 2. 每行單獨處理保留元素
   * 3. 翻譯時用特殊分隔符連接各行，以保持上下文
   * 4. 翻譯後按分隔符拆開，還原到各行
   */
  function extractTranslatableText(text) {
    // 正則表達式匹配需要保留的部分（行內元素）
    const preservePatterns = [
      // Emoji（擴展範圍）
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FAFF}]/gu,
      // URL
      /https?:\/\/[^\s]+/g,
      // 項目符號和特殊符號（擴展範圍，包含菱形等）- 只在行首
      /^[\s]*[•\-\*\→\›\»\◦\▪\▫\●\○\◉\◎\★\☆\✓\✔\✕\✖\✗\✘\➤\➜\➡\⟶\🔹\🔸\🔷\🔶\💠\♦\♢◆◇]+[\s]*/gm,
      // 數字列表
      /^[\s]*\d+[\.、\)]\s*/gm,
      // 程式碼區塊標記
      /```[\s\S]*?```/g,
      // 行內程式碼
      /`[^`]+`/g,
    ];

    const segments = [];
    let remainingText = text;
    let lastIndex = 0;

    // 找出所有需要保留的部分
    const preserveRanges = [];

    for (const pattern of preservePatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        preserveRanges.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[0]
        });
      }
    }

    // 排序並合併重疊的範圍
    preserveRanges.sort((a, b) => a.start - b.start);
    const mergedRanges = [];
    for (const range of preserveRanges) {
      if (mergedRanges.length === 0 || range.start > mergedRanges[mergedRanges.length - 1].end) {
        mergedRanges.push({ ...range });
      } else {
        mergedRanges[mergedRanges.length - 1].end = Math.max(
          mergedRanges[mergedRanges.length - 1].end,
          range.end
        );
        mergedRanges[mergedRanges.length - 1].content = text.substring(
          mergedRanges[mergedRanges.length - 1].start,
          mergedRanges[mergedRanges.length - 1].end
        );
      }
    }

    // 建立分段
    let currentPos = 0;
    for (const range of mergedRanges) {
      // 加入前面需要翻譯的部分
      if (currentPos < range.start) {
        const textPart = text.substring(currentPos, range.start);
        if (textPart.trim()) {
          segments.push({ type: 'text', content: textPart });
        } else if (textPart) {
          segments.push({ type: 'preserve', content: textPart });
        }
      }
      // 加入需要保留的部分
      segments.push({ type: 'preserve', content: range.content });
      currentPos = range.end;
    }

    // 加入最後的部分
    if (currentPos < text.length) {
      const textPart = text.substring(currentPos);
      if (textPart.trim()) {
        segments.push({ type: 'text', content: textPart });
      } else if (textPart) {
        segments.push({ type: 'preserve', content: textPart });
      }
    }

    // 如果沒有分段，整個文字都需要翻譯
    if (segments.length === 0) {
      segments.push({ type: 'text', content: text });
    }

    // ===== 新策略：按行分割，保留每行的結構 =====
    // 先把整個文字按換行分割
    const lines = text.split('\n');
    const lineInfos = lines.map(line => {
      // 檢查每行開頭是否有項目符號（擴展支援更多符號）
      const bulletMatch = line.match(/^([\s]*[•\-\*\→\›\»\◦\▪\▫\●\○\◉\◎\★\☆\✓\✔\✕\✖\✗\✘\➤\➜\➡\⟶\🔹\🔸\🔷\🔶\💠\♦\♢◆◇]+[\s]*)/);
      const numberMatch = line.match(/^([\s]*\d+[\.、\)]\s*)/);

      let prefix = '';
      let content = line;

      if (bulletMatch) {
        prefix = bulletMatch[1];
        content = line.substring(prefix.length);
      } else if (numberMatch) {
        prefix = numberMatch[1];
        content = line.substring(prefix.length);
      }

      return { prefix, content, original: line, hasContent: content.trim().length > 0 };
    });

    // 新策略：不使用特殊分隔符，而是保持原始換行
    // 只將非空行的內容連接起來翻譯，用換行符分隔
    // 這樣翻譯結果也會是用換行符分隔的
    const textsToTranslate = lineInfos
      .filter(info => info.hasContent)
      .map(info => info.content);

    log('分段結果 - 總行數:', lines.length, '需翻譯行數:', textsToTranslate.length);

    return {
      segments,
      lineInfos,
      textToTranslate: textsToTranslate.join('\n'), // 使用普通換行符
      separator: '\n', // 分隔符是換行
      lineSeparator: null
    };
  }

  /**
   * 將翻譯結果重組回原始格式
   * 新策略：按行重組，保留每行的前綴（項目符號等）
   */
  function reassembleTranslation(segments, translatedText, separator, lineSeparator, lineInfos) {
    // 如果有 lineInfos，使用新的按行重組邏輯
    if (lineInfos && lineInfos.length > 0) {
      // 分割翻譯結果（按換行符）
      const translatedParts = translatedText.split('\n');
      let translatedIndex = 0;

      log('重組開始 - 翻譯行數:', translatedParts.length, '原始行數:', lineInfos.length);
      log('翻譯結果預覽:', translatedParts.slice(0, 3).join(' | '));

      const resultLines = lineInfos.map((info, lineIdx) => {
        if (info.hasContent) {
          // 這行有內容，用翻譯結果
          if (translatedIndex < translatedParts.length) {
            const translated = translatedParts[translatedIndex].trim();
            translatedIndex++;
            log(`行 ${lineIdx}: 前綴="${info.prefix}" 翻譯="${translated.substring(0, 20)}"`);
            return info.prefix + translated;
          } else {
            // 翻譯結果不夠，保持原樣
            log(`行 ${lineIdx}: 翻譯結果不足，保留原文`);
            return info.original;
          }
        } else {
          // 空行或只有前綴的行，保持原樣
          return info.original;
        }
      });

      log('重組結果 - 翻譯部分數:', translatedParts.length, '使用了:', translatedIndex);
      return resultLines.join('\n');
    }

    // 舊邏輯（備用）
    const translatedParts = translatedText.split(separator);
    let translatedIndex = 0;

    const result = segments.map(segment => {
      if (segment.type === 'text' && translatedIndex < translatedParts.length) {
        return translatedParts[translatedIndex++].trim();
      }
      return segment.content;
    });

    return result.join('');
  }

  /**
   * 跳脫正則表達式特殊字元
   */
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function handleTranslateClick(event) {
    event.preventDefault();
    event.stopPropagation();

    log('點擊翻譯按鈕，文字:', currentSelection.text?.substring(0, 20));

    if (!currentSelection.text) {
      return;
    }

    // 顯示載入狀態
    floatingButton.classList.add('translate-btn-loading-state');

    // 提取需要翻譯的部分
    const { segments, textToTranslate, separator, lineSeparator, lineInfos } = extractTranslatableText(currentSelection.text);

    // 如果沒有需要翻譯的中文，直接返回
    if (!textToTranslate.trim() || !containsChinese(textToTranslate)) {
      log('沒有需要翻譯的中文');
      floatingButton.classList.remove('translate-btn-loading-state');
      hideFloatingButton();
      return;
    }

    // 發送翻譯請求
    try {
      // 檢查擴充功能是否仍然有效
      if (!chrome.runtime?.id) {
        logError('擴充功能已失效，請重新整理頁面');
        floatingButton.classList.remove('translate-btn-loading-state');
        showError('請重新整理');
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: 'translate',
          text: textToTranslate,
          sourceLang: 'zh-TW',
          targetLang: 'en'
        },
        function(response) {
          floatingButton.classList.remove('translate-btn-loading-state');

          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || '';
            logError('Runtime 錯誤:', errorMsg);

            // 檢查是否是 context invalidated 錯誤
            if (errorMsg.includes('context invalidated') || errorMsg.includes('Extension context')) {
              showError('請重新整理');
            } else {
              showError('連線錯誤');
            }
            return;
          }

          if (response && response.success) {
            // 重組翻譯結果
            const finalText = reassembleTranslation(segments, response.translatedText, separator, lineSeparator, lineInfos);
            log('翻譯成功:', finalText.substring(0, 50));

            // 儲存翻譯結果供收藏使用
            lastTranslation = {
              original: currentSelection.text,
              translated: finalText
            };

            // 取得按鈕位置用於顯示收藏提示
            const btnRect = floatingButton.getBoundingClientRect();
            const tooltipX = btnRect.left + window.scrollX;
            const tooltipY = btnRect.top + window.scrollY;

            replaceSelectedText(finalText);
            hideFloatingButton();

            // 顯示收藏提示
            showSaveTooltip(tooltipX, tooltipY);
          } else {
            logError('翻譯失敗:', response?.error);
            showError('翻譯失敗');
          }
        }
      );
    } catch (error) {
      logError('翻譯錯誤:', error);
      floatingButton.classList.remove('translate-btn-loading-state');

      // 檢查是否是 context invalidated 錯誤
      if (error.message?.includes('context invalidated') || error.message?.includes('Extension context')) {
        showError('請重新整理');
      } else {
        showError('翻譯錯誤');
      }
    }
  }

  // ==================== 文字替換 ====================

  function replaceSelectedText(newText) {
    log('替換文字，類型:', currentSelection.type);

    switch (currentSelection.type) {
      case 'input':
        replaceInputText(newText);
        break;
      case 'contenteditable':
        replaceContentEditableText(newText);
        break;
      default:
        logError('未知的選取類型:', currentSelection.type);
    }
  }

  /**
   * 替換標準輸入框的文字
   * 支援 React、Vue、Angular 等框架
   */
  function replaceInputText(newText) {
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

  /**
   * 觸發輸入事件（讓 React/Vue/Angular 同步狀態）
   */
  function triggerInputEvents(element, data) {
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
   * 偵測編輯器類型
   */
  function detectEditorType(element) {
    if (!element) return 'generic';

    // Slack 編輯器偵測
    if (isSlackEditor(element)) {
      return 'slack';
    }

    // Notion 編輯器偵測
    if (isNotionEditor(element)) {
      return 'notion';
    }

    // Gmail 編輯器偵測
    if (isGmailEditor(element)) {
      return 'gmail';
    }

    return 'generic';
  }

  /**
   * 檢查是否為 Slack 編輯器
   */
  function isSlackEditor(element) {
    // Slack 使用 data-qa 屬性和特定 class
    if (element.closest('[data-qa="message_input"]')) return true;
    if (element.closest('.ql-editor')) return true;
    if (element.closest('[data-message-input]')) return true;
    if (element.classList?.contains('ql-editor')) return true;
    if (window.location.hostname.includes('slack.com')) return true;
    if (window.location.hostname.includes('app.slack.com')) return true;

    // 檢查是否有 Quill 相關的父元素
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
  function isNotionEditor(element) {
    if (window.location.hostname.includes('notion.so')) return true;
    if (element.closest('[data-content-editable-leaf]')) return true;
    if (element.closest('.notion-page-content')) return true;
    return false;
  }

  /**
   * 檢查是否為 Gmail 編輯器
   */
  function isGmailEditor(element) {
    if (window.location.hostname.includes('mail.google.com')) return true;
    if (element.closest('[role="textbox"][aria-label*="Message"]')) return true;
    if (element.closest('.Am.Al.editable')) return true;
    return false;
  }

  /**
   * 替換 ContentEditable 元素的文字
   * 支援 Gmail、Notion、Slack、Medium 等
   * 保留原始格式（粗體、斜體、顏色等）
   */
  function replaceContentEditableText(newText) {
    const range = currentSelection.range;
    const element = currentSelection.element;

    if (!range) {
      logError('無法取得選取範圍');
      return;
    }

    // 偵測編輯器類型
    const editorType = detectEditorType(element);
    log('替換 ContentEditable 文字（保留格式），編輯器類型:', editorType);

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
      case 'slack':
        replaceSlackText(newText, range, element, selection);
        break;
      case 'notion':
        replaceNotionText(newText, range, element, selection);
        break;
      case 'gmail':
        replaceGmailText(newText, range, element, selection);
        break;
      default:
        replaceGenericContentEditable(newText, range, element, selection);
    }
  }

  /**
   * Slack 專用文字替換
   * Slack 使用 Quill 編輯器，需要特殊處理
   * 關鍵：保留 DOM 結構（列表、emoji 等），只替換文字內容
   *
   * 重要：對於多行內容，翻譯結果已經按行用 \n 分隔
   * 我們需要把翻譯結果按行分配回各個 DOM 節點
   */
  function replaceSlackText(newText, range, element, selection) {
    log('使用 Slack 專用替換方法');

    // 保存格式資訊（在刪除前）
    const formatInfo = captureSlackFormat(range);
    log('Slack 格式資訊:', formatInfo);

    // 記錄選取的文字
    const selectedText = range.toString();
    log('選取的文字:', selectedText, '長度:', selectedText.length);

    // 檢查是否跨多個節點（複雜選取）
    const isComplexSelection = range.startContainer !== range.endContainer;
    log('是否複雜選取:', isComplexSelection);

    // ===== 優先方法：保留結構的文字節點替換 =====
    // 這個方法會保留 emoji、列表符號等非文字元素
    if (isComplexSelection) {
      log('偵測到複雜選取，使用結構保留替換');

      // 將翻譯結果按換行分割（對應原始的多行結構）
      const translatedLines = newText.split('\n');
      log('翻譯結果行數:', translatedLines.length);

      const success = replaceTextNodesInRangeByLine(range, translatedLines, selection);
      if (success) {
        triggerSlackSync(element);
        return;
      }
    }

    // ===== 方法 1: execCommand insertText =====
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

    // ===== 方法 2: 單節點 DOM 操作 =====
    try {
      log('嘗試單節點 DOM 操作');

      // 如果選取在同一個文字節點內
      if (range.startContainer === range.endContainer &&
          range.startContainer.nodeType === Node.TEXT_NODE) {

        const textNode = range.startContainer;
        const before = textNode.textContent.substring(0, range.startOffset);
        const after = textNode.textContent.substring(range.endOffset);
        textNode.textContent = before + newText + after;

        // 設定游標
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

    // ===== 方法 3: 結構保留替換（複雜選取）=====
    try {
      log('嘗試結構保留替換');
      const success = replaceTextNodesInRange(range, newText, selection);
      if (success) {
        triggerSlackSync(element);
        return;
      }
    } catch (e) {
      logError('結構保留替換失敗:', e);
    }

    // ===== 方法 4: execCommand insertHTML =====
    try {
      selection.removeAllRanges();
      selection.addRange(range);

      const formattedHtml = formatInfo.hasFormat
        ? wrapWithSlackFormat(newText, formatInfo)
        : escapeHtml(newText);

      const success = document.execCommand('insertHTML', false, formattedHtml);
      if (success) {
        log('Slack execCommand insertHTML 成功');
        triggerSlackSync(element);
        return;
      }
    } catch (e) {
      log('Slack execCommand insertHTML 失敗:', e);
    }

    // ===== 最後手段 =====
    logError('所有方法都失敗，使用 fallback');
    fallbackTextReplace(range, newText, element);
    triggerSlackSync(element);
  }

  /**
   * 按行替換文字節點（用於 Slack 多行內容）
   * 每一行（通常是一個 <p> 或 <li>）對應一個翻譯結果
   */
  function replaceTextNodesInRangeByLine(range, translatedLines, selection) {
    try {
      // 收集選取範圍內的所有「行容器」（通常是 p, li, div 等區塊元素）
      let walkRoot = range.commonAncestorContainer;
      if (walkRoot.nodeType === Node.TEXT_NODE) {
        walkRoot = walkRoot.parentElement;
      }

      // 找到包含所有選取內容的容器
      while (walkRoot && !walkRoot.contains(range.endContainer)) {
        walkRoot = walkRoot.parentElement;
      }

      if (!walkRoot) {
        log('找不到共同容器');
        return false;
      }

      log('行替換 - 根容器:', walkRoot.tagName);

      // 找出所有「行」元素（block-level 元素）
      const blockElements = [];
      const blockTags = ['P', 'LI', 'DIV', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

      // 收集選取範圍內的區塊元素
      const collectBlocks = (node) => {
        if (!node) return;

        // 檢查這個節點是否在選取範圍內
        const nodeRange = document.createRange();
        try {
          nodeRange.selectNode(node);
          const isInRange = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
                           range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0;

          if (!isInRange) return;
        } catch (e) {
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          if (blockTags.includes(node.tagName)) {
            // 這是一個區塊元素
            blockElements.push(node);
            return; // 不再遞迴，因為我們要的是這個層級
          }
        }

        // 遞迴檢查子節點
        for (const child of node.childNodes) {
          collectBlocks(child);
        }
      };

      collectBlocks(walkRoot);

      log('找到的區塊元素數:', blockElements.length, '翻譯行數:', translatedLines.length);

      // 如果沒找到區塊元素，或只有一行翻譯，使用原本的方法
      if (blockElements.length === 0) {
        log('沒有區塊元素，回退到原方法');
        return replaceTextNodesInRange(range, translatedLines.join('\n'), selection);
      }

      // 如果翻譯行數與區塊數不匹配，嘗試智能匹配
      if (blockElements.length !== translatedLines.length) {
        log('行數不匹配，嘗試智能分配');
        // 把所有翻譯合併，然後用原方法
        return replaceTextNodesInRange(range, translatedLines.join('\n'), selection);
      }

      // 逐行替換
      for (let i = 0; i < blockElements.length; i++) {
        const block = blockElements[i];
        const translatedLine = translatedLines[i] || '';

        log(`替換第 ${i + 1} 行:`, translatedLine.substring(0, 30));

        // 找出這個區塊內的所有文字節點
        const textNodes = [];
        const walker = document.createTreeWalker(
          block,
          NodeFilter.SHOW_TEXT,
          null
        );

        let textNode;
        while (textNode = walker.nextNode()) {
          // 跳過保留元素（連結、程式碼）內的文字
          const parent = textNode.parentElement;
          const isInCode = parent?.closest('code, pre, .c-mrkdwn__code');
          const isInLink = parent?.closest('a');

          if (!isInCode && !isInLink && textNode.textContent.trim()) {
            textNodes.push(textNode);
          }
        }

        if (textNodes.length === 0) continue;

        // 把翻譯結果放到第一個文字節點
        textNodes[0].textContent = translatedLine;

        // 清空其他文字節點
        for (let j = 1; j < textNodes.length; j++) {
          textNodes[j].textContent = '';
        }
      }

      // 設定游標位置
      if (blockElements.length > 0) {
        const lastBlock = blockElements[blockElements.length - 1];
        try {
          const newRange = document.createRange();
          newRange.selectNodeContents(lastBlock);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e) {
          log('設定游標失敗:', e);
        }
      }

      log('按行替換成功');
      return true;

    } catch (e) {
      logError('replaceTextNodesInRangeByLine 失敗:', e);
      return false;
    }
  }

  /**
   * 保留 DOM 結構，只替換選取範圍內的文字節點
   * 這樣可以保留 emoji、列表符號、圖片等非文字元素
   * 同時保留連結 URL 和程式碼區塊（不翻譯，保持原樣）
   */
  function replaceTextNodesInRange(range, newText, selection) {
    try {
      // 收集選取範圍內的所有文字節點，以及它們的資訊
      const textNodesInfo = [];

      // 決定遍歷的根節點
      let walkRoot = range.commonAncestorContainer;
      if (walkRoot.nodeType === Node.TEXT_NODE) {
        walkRoot = walkRoot.parentElement;
      }
      // 確保我們有足夠大的遍歷範圍
      if (walkRoot && !walkRoot.contains(range.startContainer)) {
        walkRoot = walkRoot.parentElement || walkRoot;
      }

      const walker = document.createTreeWalker(
        walkRoot,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const nodeRange = document.createRange();
            nodeRange.selectNode(node);

            if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
                range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.trim() || node === range.startContainer || node === range.endContainer) {
          // 檢查這個文字節點是否在特殊元素內
          const parentEl = node.parentElement;

          // ===== 增強的程式碼偵測 =====
          // 檢查多種程式碼元素
          const codeParent = parentEl?.closest('code, pre, .c-mrkdwn__code, .ql-code, [data-code]');

          // 也檢查是否直接父元素是 CODE
          const isDirectCodeChild = parentEl?.tagName?.toUpperCase() === 'CODE' ||
                                    parentEl?.tagName?.toUpperCase() === 'PRE';

          // 檢查 Slack 特定的程式碼 class
          const hasCodeClass = parentEl?.classList?.contains('c-mrkdwn__code') ||
                               parentEl?.classList?.contains('ql-code') ||
                               parentEl?.closest('.c-mrkdwn__code') ||
                               parentEl?.closest('.ql-code');

          const isInCode = !!codeParent || isDirectCodeChild || hasCodeClass;

          // 連結偵測
          const linkParent = parentEl?.closest('a');
          const isInLink = !!linkParent;
          const linkHref = linkParent?.href || null;

          textNodesInfo.push({
            node: node,
            isInLink: isInLink,
            isInCode: isInCode,
            isPreserved: isInLink || isInCode, // 需要保留的元素
            linkHref: linkHref,
            linkElement: linkParent,
            codeElement: codeParent || (isDirectCodeChild ? parentEl : null),
            originalText: node.textContent
          });

          // 除錯輸出
          if (isInCode) {
            log('偵測到程式碼節點:', node.textContent.substring(0, 20), 'parent:', parentEl?.tagName);
          }
        }
      }

      log('找到的文字節點數:', textNodesInfo.length);
      log('連結節點:', textNodesInfo.filter(n => n.isInLink).length);
      log('程式碼節點:', textNodesInfo.filter(n => n.isInCode).length);

      // 輸出詳細的節點資訊供除錯
      if (textNodesInfo.some(n => n.isPreserved)) {
        log('保留節點詳情:', textNodesInfo.filter(n => n.isPreserved).map(n => ({
          text: n.originalText.substring(0, 20),
          type: n.isInCode ? 'code' : 'link'
        })));
      }

      if (textNodesInfo.length === 0) {
        return false;
      }

      // 檢查是否有需要保留的元素（連結或程式碼）
      const hasPreservedElements = textNodesInfo.some(n => n.isPreserved);

      if (hasPreservedElements) {
        log('偵測到選取範圍包含需保留的元素（連結/程式碼）');
        return replaceWithPreservation(range, newText, selection, textNodesInfo);
      }

      // 沒有需要保留的元素，使用原本的邏輯
      const textNodes = textNodesInfo.map(info => info.node);

      if (textNodes.length === 1) {
        const textNode = textNodes[0];
        const start = textNode === range.startContainer ? range.startOffset : 0;
        const end = textNode === range.endContainer ? range.endOffset : textNode.textContent.length;

        const before = textNode.textContent.substring(0, start);
        const after = textNode.textContent.substring(end);
        textNode.textContent = before + newText + after;

        const newRange = document.createRange();
        newRange.setStart(textNode, before.length + newText.length);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        log('單文字節點替換成功');
        return true;
      }

      // 多個文字節點
      const firstNode = textNodes[0];
      const lastNode = textNodes[textNodes.length - 1];

      const startOffset = firstNode === range.startContainer ? range.startOffset : 0;
      const beforeText = firstNode.textContent.substring(0, startOffset);

      const endOffset = lastNode === range.endContainer ? range.endOffset : lastNode.textContent.length;
      const afterText = lastNode.textContent.substring(endOffset);

      firstNode.textContent = beforeText + newText;

      for (let i = 1; i < textNodes.length - 1; i++) {
        textNodes[i].textContent = '';
      }

      if (lastNode !== firstNode) {
        lastNode.textContent = afterText;
      } else {
        firstNode.textContent = beforeText + newText + afterText;
      }

      const newRange = document.createRange();
      newRange.setStart(firstNode, beforeText.length + newText.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      log('多文字節點替換成功');
      return true;

    } catch (e) {
      logError('replaceTextNodesInRange 失敗:', e);
      return false;
    }
  }

  /**
   * 保留特殊元素（連結、程式碼）的替換方法
   * 這些元素不翻譯，保持原樣
   */
  function replaceWithPreservation(range, newText, selection, textNodesInfo) {
    try {
      // 收集原始結構資訊，分組相鄰的相同類型節點
      const segments = [];
      let currentSegment = null;

      for (const info of textNodesInfo) {
        const segmentType = info.isInCode ? 'code' : (info.isInLink ? 'link' : 'text');
        const segmentElement = info.codeElement || info.linkElement || null;

        // 檢查是否需要開始新分段
        const needNewSegment = !currentSegment ||
          currentSegment.type !== segmentType ||
          (segmentElement && currentSegment.element !== segmentElement);

        if (needNewSegment) {
          if (currentSegment && currentSegment.nodes.length > 0) {
            segments.push(currentSegment);
          }
          currentSegment = {
            type: segmentType,
            nodes: [info],
            element: segmentElement,
            isPreserved: info.isPreserved,
            originalContent: info.originalText // 保存原始內容
          };
        } else {
          currentSegment.nodes.push(info);
          // 累加原始內容
          currentSegment.originalContent = (currentSegment.originalContent || '') + info.originalText;
        }
      }
      if (currentSegment && currentSegment.nodes.length > 0) {
        segments.push(currentSegment);
      }

      log('分段數:', segments.length, '類型:', segments.map(s => `${s.type}(${s.originalContent?.substring(0, 10)})`));

      // 分離需要翻譯的部分和需要保留的部分
      const textSegments = segments.filter(s => s.type === 'text');
      const preservedSegments = segments.filter(s => s.isPreserved);

      log('需翻譯段落:', textSegments.length, '保留段落:', preservedSegments.length);

      // 如果沒有需要翻譯的文字部分
      if (textSegments.length === 0) {
        log('選取範圍全是保留元素（連結/程式碼），不進行翻譯替換');
        return false;
      }

      // ===== 關鍵修正：處理混合內容（文字 + 程式碼）的情況 =====
      // 策略：只替換純文字部分，程式碼區塊完全不動

      // 追蹤是否已插入翻譯
      let translationInserted = false;
      let lastModifiedNode = null;

      for (let segIndex = 0; segIndex < segments.length; segIndex++) {
        const segment = segments[segIndex];

        if (segment.isPreserved) {
          // ===== 保留的元素（連結、程式碼）完全不做任何修改 =====
          log(`保留 ${segment.type} 元素:`, segment.originalContent);
          // 完全跳過，不修改任何內容
          continue;
        }

        // ===== 純文字部分 =====
        for (let i = 0; i < segment.nodes.length; i++) {
          const info = segment.nodes[i];
          const node = info.node;

          // 確保節點還存在於 DOM 中
          if (!node.parentNode) {
            log('節點已不在 DOM 中，跳過');
            continue;
          }

          if (!translationInserted) {
            // 第一個純文字節點：放翻譯結果
            const start = node === range.startContainer ? range.startOffset : 0;
            const before = node.textContent.substring(0, start);

            // 如果這也是最後一個純文字節點（在選取範圍內）
            if (node === range.endContainer && segment.nodes.length === 1 && textSegments.length === 1) {
              const end = range.endOffset;
              const after = node.textContent.substring(end);
              node.textContent = before + newText + after;
            } else {
              node.textContent = before + newText;
            }

            translationInserted = true;
            lastModifiedNode = node;
            log('翻譯已插入第一個純文字節點');
          } else {
            // 後續的純文字節點
            if (node === range.endContainer) {
              // 最後一個節點，保留選取範圍之後的文字
              const end = range.endOffset;
              const after = node.textContent.substring(end);
              node.textContent = after;
            } else {
              // 中間節點，清空
              node.textContent = '';
            }
          }
        }
      }

      // 設定游標位置
      if (lastModifiedNode) {
        try {
          const newRange = document.createRange();
          newRange.setStart(lastModifiedNode, lastModifiedNode.textContent.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e) {
          log('設定游標失敗:', e);
        }
      }

      log('保留元素替換成功，翻譯已插入:', translationInserted);
      return translationInserted;

    } catch (e) {
      logError('replaceWithPreservation 失敗:', e);
      return false;
    }
  }

  // 為了向後相容，保留舊函數名
  function replaceWithLinkPreservation(range, newText, selection, textNodesInfo) {
    return replaceWithPreservation(range, newText, selection, textNodesInfo);
  }

  /**
   * 捕獲 Slack/Quill 的格式資訊（增強版）
   * 支援：粗體、斜體、底線、刪除線、程式碼、程式碼區塊、連結、列表等
   */
  function captureSlackFormat(range) {
    const formatInfo = {
      hasFormat: false,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      code: false,
      codeBlock: false,
      link: null,
      linkText: null,
      list: null,           // 'bullet' | 'ordered' | null
      listItem: false,
      blockquote: false,
      color: null,
      backgroundColor: null,
      parentNodes: [],
      // 保存完整的格式鏈（從內到外）
      formatChain: []
    };

    try {
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }

      // 向上遍歷找格式元素
      let current = node;
      let depth = 0;
      while (current && depth < 20) {
        const tagName = current.tagName?.toUpperCase();
        const classList = current.classList;
        const style = current.style;

        // ===== 粗體 =====
        if (tagName === 'B' || tagName === 'STRONG' ||
            classList?.contains('c-mrkdwn__bold') ||
            classList?.contains('ql-bold')) {
          formatInfo.bold = true;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'bold', node: current });
        }

        // ===== 斜體 =====
        if (tagName === 'I' || tagName === 'EM' ||
            classList?.contains('c-mrkdwn__italic') ||
            classList?.contains('ql-italic')) {
          formatInfo.italic = true;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'italic', node: current });
        }

        // ===== 底線 =====
        if (tagName === 'U' ||
            classList?.contains('c-mrkdwn__underline') ||
            classList?.contains('ql-underline')) {
          formatInfo.underline = true;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'underline', node: current });
        }

        // ===== 刪除線 =====
        if (tagName === 'S' || tagName === 'STRIKE' || tagName === 'DEL' ||
            classList?.contains('c-mrkdwn__strike') ||
            classList?.contains('ql-strike')) {
          formatInfo.strike = true;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'strike', node: current });
        }

        // ===== 行內程式碼 =====
        if (tagName === 'CODE' && !formatInfo.codeBlock) {
          // 確認不是在 PRE 內的 CODE
          if (!current.closest('pre')) {
            formatInfo.code = true;
            formatInfo.hasFormat = true;
            formatInfo.formatChain.push({ type: 'code', node: current });
          }
        }
        if (classList?.contains('c-mrkdwn__code') ||
            classList?.contains('ql-code')) {
          formatInfo.code = true;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'code', node: current });
        }

        // ===== 程式碼區塊 =====
        if (tagName === 'PRE' ||
            classList?.contains('c-mrkdwn__pre') ||
            classList?.contains('ql-code-block') ||
            classList?.contains('ql-syntax')) {
          formatInfo.codeBlock = true;
          formatInfo.code = false; // 區塊優先於行內
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'codeBlock', node: current });
        }

        // ===== 連結 =====
        if (tagName === 'A') {
          formatInfo.link = current.href;
          formatInfo.linkText = current.textContent;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'link', node: current, href: current.href });
        }

        // ===== 列表 =====
        if (tagName === 'LI') {
          formatInfo.listItem = true;
          formatInfo.hasFormat = true;
        }
        if (tagName === 'UL' || classList?.contains('c-mrkdwn__list--bullet')) {
          formatInfo.list = 'bullet';
          formatInfo.hasFormat = true;
        }
        if (tagName === 'OL' || classList?.contains('c-mrkdwn__list--ordered')) {
          formatInfo.list = 'ordered';
          formatInfo.hasFormat = true;
        }

        // ===== 引用區塊 =====
        if (tagName === 'BLOCKQUOTE' ||
            classList?.contains('c-mrkdwn__quote') ||
            classList?.contains('ql-blockquote')) {
          formatInfo.blockquote = true;
          formatInfo.hasFormat = true;
          formatInfo.formatChain.push({ type: 'blockquote', node: current });
        }

        // ===== SPAN 樣式檢查 =====
        if (tagName === 'SPAN' || style) {
          // 粗體
          if (style?.fontWeight === 'bold' || parseInt(style?.fontWeight) >= 700) {
            if (!formatInfo.bold) {
              formatInfo.bold = true;
              formatInfo.hasFormat = true;
              formatInfo.formatChain.push({ type: 'bold', node: current, isStyle: true });
            }
          }
          // 斜體
          if (style?.fontStyle === 'italic') {
            if (!formatInfo.italic) {
              formatInfo.italic = true;
              formatInfo.hasFormat = true;
              formatInfo.formatChain.push({ type: 'italic', node: current, isStyle: true });
            }
          }
          // 底線
          if (style?.textDecoration?.includes('underline') ||
              style?.textDecorationLine?.includes('underline')) {
            if (!formatInfo.underline) {
              formatInfo.underline = true;
              formatInfo.hasFormat = true;
              formatInfo.formatChain.push({ type: 'underline', node: current, isStyle: true });
            }
          }
          // 刪除線
          if (style?.textDecoration?.includes('line-through') ||
              style?.textDecorationLine?.includes('line-through')) {
            if (!formatInfo.strike) {
              formatInfo.strike = true;
              formatInfo.hasFormat = true;
              formatInfo.formatChain.push({ type: 'strike', node: current, isStyle: true });
            }
          }
          // 顏色
          if (style?.color && style.color !== 'inherit' && style.color !== 'initial') {
            formatInfo.color = style.color;
            formatInfo.hasFormat = true;
          }
          // 背景色
          if (style?.backgroundColor &&
              style.backgroundColor !== 'transparent' &&
              style.backgroundColor !== 'inherit' &&
              style.backgroundColor !== 'initial' &&
              style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            formatInfo.backgroundColor = style.backgroundColor;
            formatInfo.hasFormat = true;
          }
        }

        // 保存格式節點供後續複製（只保存格式相關的節點）
        const isFormatNode = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
                              'CODE', 'A', 'SPAN', 'MARK', 'FONT'].includes(tagName);
        if (isFormatNode && !current.isContentEditable) {
          formatInfo.parentNodes.push(current.cloneNode(false));
        }

        // 到達編輯器容器就停止
        if (current.isContentEditable || current.contentEditable === 'true') {
          break;
        }

        current = current.parentElement;
        depth++;
      }
    } catch (e) {
      log('捕獲格式失敗:', e);
    }

    log('格式偵測結果:', {
      bold: formatInfo.bold,
      italic: formatInfo.italic,
      underline: formatInfo.underline,
      strike: formatInfo.strike,
      code: formatInfo.code,
      codeBlock: formatInfo.codeBlock,
      link: formatInfo.link,
      list: formatInfo.list,
      color: formatInfo.color
    });

    return formatInfo;
  }

  /**
   * 用 Slack 格式包裝文字（增強版）
   * 支援：粗體、斜體、底線、刪除線、程式碼、程式碼區塊、連結、顏色等
   */
  function wrapWithSlackFormat(text, formatInfo) {
    let html = escapeHtml(text);

    // 如果是程式碼區塊，保留換行
    if (formatInfo.codeBlock) {
      // 程式碼區塊 - 使用 <pre><code>
      html = `<pre><code>${html}</code></pre>`;
      return html;
    }

    // 處理顏色和背景色（最內層）
    if (formatInfo.color || formatInfo.backgroundColor) {
      let style = '';
      if (formatInfo.color) {
        style += `color:${formatInfo.color};`;
      }
      if (formatInfo.backgroundColor) {
        style += `background-color:${formatInfo.backgroundColor};`;
      }
      html = `<span style="${style}">${html}</span>`;
    }

    // 按照從內到外的順序包裝
    // 行內程式碼
    if (formatInfo.code) {
      html = `<code>${html}</code>`;
    }

    // 刪除線
    if (formatInfo.strike) {
      html = `<s>${html}</s>`;
    }

    // 底線
    if (formatInfo.underline) {
      html = `<u>${html}</u>`;
    }

    // 斜體
    if (formatInfo.italic) {
      html = `<i>${html}</i>`;
    }

    // 粗體
    if (formatInfo.bold) {
      html = `<b>${html}</b>`;
    }

    // 連結（最外層）
    if (formatInfo.link) {
      html = `<a href="${escapeHtml(formatInfo.link)}">${html}</a>`;
    }

    return html;
  }

  /**
   * 使用格式鏈重建 HTML（更精確的方法）
   */
  function rebuildWithFormatChain(text, formatInfo) {
    // 如果有保存的格式鏈，使用它
    if (formatInfo.formatChain && formatInfo.formatChain.length > 0) {
      let result = document.createTextNode(text);

      // 從最內層到最外層包裝
      for (let i = formatInfo.formatChain.length - 1; i >= 0; i--) {
        const format = formatInfo.formatChain[i];
        let wrapper;

        if (format.node) {
          // 複製原始節點（保留所有屬性）
          wrapper = format.node.cloneNode(false);
        } else {
          // 根據類型創建新節點
          switch (format.type) {
            case 'bold':
              wrapper = document.createElement('b');
              break;
            case 'italic':
              wrapper = document.createElement('i');
              break;
            case 'underline':
              wrapper = document.createElement('u');
              break;
            case 'strike':
              wrapper = document.createElement('s');
              break;
            case 'code':
              wrapper = document.createElement('code');
              break;
            case 'link':
              wrapper = document.createElement('a');
              if (format.href) wrapper.href = format.href;
              break;
            default:
              continue;
          }
        }

        wrapper.appendChild(result);
        result = wrapper;
      }

      return result;
    }

    // 否則使用 HTML 字串方法
    const html = wrapWithSlackFormat(text, formatInfo);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.firstChild || document.createTextNode(text);
  }

  /**
   * 帶格式保留的 DOM 替換（增強版）
   */
  function replaceWithFormatPreservation(newText, range, element, selection, formatInfo) {
    // 刪除選取內容
    range.deleteContents();

    // 建立新節點
    let newNode;

    if (formatInfo.hasFormat) {
      // 方法 1: 使用格式鏈重建（最精確）
      if (formatInfo.formatChain && formatInfo.formatChain.length > 0) {
        newNode = rebuildWithFormatChain(newText, formatInfo);
      }
      // 方法 2: 使用保存的父節點
      else if (formatInfo.parentNodes.length > 0) {
        newNode = document.createTextNode(newText);
        for (let i = formatInfo.parentNodes.length - 1; i >= 0; i--) {
          const wrapper = formatInfo.parentNodes[i].cloneNode(false);
          wrapper.appendChild(newNode);
          newNode = wrapper;
        }
      }
      // 方法 3: 使用 HTML 字串
      else {
        const html = wrapWithSlackFormat(newText, formatInfo);
        const temp = document.createElement('div');
        temp.innerHTML = html;
        newNode = temp.firstChild || document.createTextNode(newText);
      }
    } else {
      newNode = document.createTextNode(newText);
    }

    // 插入節點
    range.insertNode(newNode);

    // 移動游標到新節點末尾
    const newRange = document.createRange();
    try {
      if (newNode.nodeType === Node.TEXT_NODE) {
        newRange.setStart(newNode, newNode.length);
      } else {
        // 對於元素節點，找到最深的文字節點
        let lastChild = newNode;
        while (lastChild.lastChild) {
          lastChild = lastChild.lastChild;
        }
        if (lastChild.nodeType === Node.TEXT_NODE) {
          newRange.setStart(lastChild, lastChild.length);
        } else {
          newRange.setStartAfter(newNode);
        }
      }
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } catch (e) {
      log('設定游標位置失敗:', e);
    }
  }

  /**
   * 觸發 Slack 編輯器同步
   */
  function triggerSlackSync(element) {
    if (!element) return;

    // 找到正確的編輯器容器
    const editor = element.closest('[data-qa="message_input"]') ||
                   element.closest('.ql-editor') ||
                   element.closest('[contenteditable="true"]') ||
                   element;

    // 1. InputEvent - 最重要的事件
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

    // 2. Change 事件
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    // 3. Quill 專用事件
    editor.dispatchEvent(new CustomEvent('text-change', {
      bubbles: true,
      detail: { source: 'user' }
    }));

    // 4. 模擬編輯完成
    editor.dispatchEvent(new Event('blur', { bubbles: true }));
    setTimeout(() => {
      editor.focus();
    }, 10);

    // 5. MutationObserver 觸發
    try {
      // 強制觸發 mutation
      const dummy = document.createComment('');
      editor.appendChild(dummy);
      dummy.remove();
    } catch (e) {
      // ignore
    }

    // 6. React 相關事件
    editor.dispatchEvent(new CustomEvent('react-dom-input', { bubbles: true }));

    // 7. 對於 Draft.js
    editor.dispatchEvent(new Event('beforeinput', {
      bubbles: true,
      cancelable: true
    }));

    log('Slack 同步事件已觸發 (element:', editor.tagName, ')');
  }

  /**
   * Notion 專用文字替換
   */
  function replaceNotionText(newText, range, element, selection) {
    log('使用 Notion 專用替換方法');

    // Notion 使用 ProseMirror，execCommand 通常有效
    try {
      const success = document.execCommand('insertText', false, newText);
      if (success) {
        log('Notion execCommand 成功');
        triggerContentEditableEvents(element);
        return;
      }
    } catch (e) {
      log('Notion execCommand 失敗');
    }

    // Fallback 到通用方法
    replaceGenericContentEditable(newText, range, element, selection);
  }

  /**
   * Gmail 專用文字替換
   */
  function replaceGmailText(newText, range, element, selection) {
    log('使用 Gmail 專用替換方法');

    // Gmail 的 execCommand 支援良好
    try {
      const success = document.execCommand('insertText', false, newText);
      if (success) {
        log('Gmail execCommand 成功');
        triggerContentEditableEvents(element);
        return;
      }
    } catch (e) {
      log('Gmail execCommand 失敗');
    }

    // Fallback
    replaceGenericContentEditable(newText, range, element, selection);
  }

  /**
   * 通用 ContentEditable 替換
   */
  function replaceGenericContentEditable(newText, range, element, selection) {
    log('使用通用 ContentEditable 替換方法');

    // 方法 1: execCommand insertText (最佳 - 保留格式)
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

    // 方法 2: 使用 insertHTML 保留格式
    try {
      const computedStyle = getSelectionStartStyle(range);
      if (computedStyle) {
        const styledHtml = `<span style="${computedStyle}">${escapeHtml(newText)}</span>`;
        const success = document.execCommand('insertHTML', false, styledHtml);
        if (success) {
          log('ContentEditable insertHTML 成功（帶格式）');
          triggerContentEditableEvents(element);
          return;
        }
      }
    } catch (e) {
      log('insertHTML 方法失敗');
    }

    // 方法 3: Range API（保留格式版本）
    try {
      const startContainer = range.startContainer;
      const formatElement = getFormatElement(startContainer);

      range.deleteContents();

      let newNode;
      if (formatElement && formatElement !== element) {
        newNode = formatElement.cloneNode(false);
        newNode.textContent = newText;
      } else {
        newNode = document.createTextNode(newText);
      }

      range.insertNode(newNode);

      const newRange = document.createRange();
      newRange.setStartAfter(newNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      triggerContentEditableEvents(element);
      log('Range API 替換完成（保留格式）');
    } catch (e) {
      logError('ContentEditable 替換失敗:', e);
      fallbackTextReplace(range, newText, element);
    }
  }

  /**
   * 取得選取起始位置的樣式
   */
  function getSelectionStartStyle(range) {
    try {
      const startContainer = range.startContainer;
      const element = startContainer.nodeType === Node.TEXT_NODE
        ? startContainer.parentElement
        : startContainer;

      if (!element) return null;

      const computed = window.getComputedStyle(element);
      const styles = [];

      // 檢查重要的文字格式
      if (computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 700) {
        styles.push('font-weight:bold');
      }
      if (computed.fontStyle === 'italic') {
        styles.push('font-style:italic');
      }
      if (computed.textDecoration.includes('underline')) {
        styles.push('text-decoration:underline');
      }
      if (computed.textDecoration.includes('line-through')) {
        styles.push('text-decoration:line-through');
      }
      // 只有非黑色才保留顏色
      const color = computed.color;
      if (color && color !== 'rgb(0, 0, 0)' && color !== '#000000' && color !== 'black') {
        styles.push(`color:${color}`);
      }
      // 背景色
      const bgColor = computed.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        styles.push(`background-color:${bgColor}`);
      }

      return styles.length > 0 ? styles.join(';') : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 取得文字節點的格式父元素
   */
  function getFormatElement(node) {
    if (!node) return null;

    // 如果是文字節點，取得父元素
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    // 向上尋找格式元素（但不超過 contenteditable 容器）
    const formatTags = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SPAN', 'FONT', 'MARK'];

    while (element) {
      if (element.isContentEditable && element.contentEditable === 'true') {
        // 到達容器，停止
        return null;
      }
      if (formatTags.includes(element.tagName)) {
        return element;
      }
      element = element.parentElement;
    }

    return null;
  }

  /**
   * HTML 跳脫
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 最後手段的純文字替換
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

  /**
   * 觸發 ContentEditable 相關事件
   */
  function triggerContentEditableEvents(element) {
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

    // 對於某些需要 blur/focus 觸發更新的編輯器
    // element.blur();
    // element.focus();
  }

  // ==================== 錯誤顯示 ====================

  function showError(message) {
    floatingButton.classList.add('translate-btn-error');
    floatingButton.querySelector('.translate-btn-text').textContent = message;

    setTimeout(() => {
      floatingButton.classList.remove('translate-btn-error');
      floatingButton.querySelector('.translate-btn-text').textContent = '譯';
      hideFloatingButton();
    }, 2000);
  }

  // ==================== 啟動 ====================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
