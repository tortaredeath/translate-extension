/**
 * 翻譯處理
 */

import { log, logError } from './config.js';
import { currentSelection, setLastTranslation } from './state.js';
import { MessageActions } from '../shared/constants.js';
import { extractTranslatableText, reassembleTranslation } from './selection/textExtractor.js';
import { containsChinese } from './selection/elementDetector.js';
import {
  hideFloatingButton,
  setButtonLoading,
  showButtonError,
  getButtonPosition
} from './ui/floatingButton.js';
import { showSaveTooltip } from './ui/saveTooltip.js';
import { replaceInputText } from './replacement/inputReplacer.js';
import { replaceContentEditableText } from './replacement/contentEditableReplacer.js';

/**
 * 處理翻譯按鈕點擊
 */
export function handleTranslateClick(event) {
  event.preventDefault();
  event.stopPropagation();

  log('點擊翻譯按鈕，文字:', currentSelection.text?.substring(0, 20));

  if (!currentSelection.text) {
    return;
  }

  // 顯示載入狀態
  setButtonLoading(true);

  // 提取需要翻譯的部分
  const { segments, textToTranslate, separator, lineSeparator, lineInfos } = extractTranslatableText(currentSelection.text);

  // 如果沒有需要翻譯的中文，直接返回
  if (!textToTranslate.trim() || !containsChinese(textToTranslate)) {
    log('沒有需要翻譯的中文');
    setButtonLoading(false);
    hideFloatingButton();
    return;
  }

  // 發送翻譯請求
  try {
    // 檢查擴充功能是否仍然有效
    if (!chrome.runtime?.id) {
      logError('擴充功能已失效，請重新整理頁面');
      setButtonLoading(false);
      showButtonError('請重新整理');
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: MessageActions.TRANSLATE,
        text: textToTranslate,
        sourceLang: 'zh-TW',
        targetLang: 'en'
      },
      function(response) {
        setButtonLoading(false);

        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || '';
          logError('Runtime 錯誤:', errorMsg);

          if (errorMsg.includes('context invalidated') || errorMsg.includes('Extension context')) {
            showButtonError('請重新整理');
          } else {
            showButtonError('連線錯誤');
          }
          return;
        }

        if (response && response.success) {
          // 重組翻譯結果
          const finalText = reassembleTranslation(segments, response.translatedText, separator, lineSeparator, lineInfos);
          log('翻譯成功:', finalText.substring(0, 50));

          // 儲存翻譯結果供收藏使用
          setLastTranslation({
            original: currentSelection.text,
            translated: finalText
          });

          // 取得按鈕位置用於顯示收藏提示
          const btnPos = getButtonPosition();

          replaceSelectedText(finalText);
          hideFloatingButton();

          // 顯示收藏提示
          if (btnPos) {
            showSaveTooltip(btnPos.x, btnPos.y);
          }
        } else {
          logError('翻譯失敗:', response?.error);
          showButtonError('翻譯失敗');
        }
      }
    );
  } catch (error) {
    logError('翻譯錯誤:', error);
    setButtonLoading(false);

    if (error.message?.includes('context invalidated') || error.message?.includes('Extension context')) {
      showButtonError('請重新整理');
    } else {
      showButtonError('翻譯錯誤');
    }
  }
}

/**
 * 替換選取的文字
 */
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
