/**
 * 中英翻譯助手 - Background Script (Service Worker) v2.0.2
 * 模組化重構版本
 */

import { MessageActions, StorageKeys } from '../shared/constants.js';
import { translateText } from './translateApi.js';

console.log('[翻譯助手 BG] Service Worker 已啟動');

// ==================== 訊息處理 ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[翻譯助手 BG] 收到訊息:', request.action);

  switch (request.action) {
    case MessageActions.TRANSLATE:
      handleTranslate(request, sendResponse);
      return true;

    case MessageActions.UPDATE_STATS:
      updateStats(request.charCount)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case MessageActions.GET_STATS:
      getStats()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case MessageActions.ADD_VOCABULARY:
      addVocabulary(request.word)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case MessageActions.GET_VOCABULARY:
      getVocabulary()
        .then(vocabulary => sendResponse({ success: true, vocabulary }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case MessageActions.REMOVE_VOCABULARY:
      removeVocabulary(request.index)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case MessageActions.CLEAR_VOCABULARY:
      clearVocabulary()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    default:
      sendResponse({ success: false, error: '未知的操作' });
  }
});

// ==================== 翻譯處理 ====================

async function handleTranslate(request, sendResponse) {
  console.log('[翻譯助手 BG] 開始翻譯:', request.text?.substring(0, 30));

  try {
    const result = await translateText(request.text, request.sourceLang, request.targetLang);
    console.log('[翻譯助手 BG] 翻譯成功:', result?.substring(0, 30));

    const charCount = request.text?.length || 0;
    await updateStats(charCount);

    sendResponse({ success: true, translatedText: result });
  } catch (error) {
    console.error('[翻譯助手 BG] 翻譯錯誤:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ==================== 統計功能 ====================

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function updateStats(charCount) {
  const monthKey = getCurrentMonthKey();

  try {
    const result = await chrome.storage.local.get(StorageKeys.TRANSLATE_STATS);
    const stats = result[StorageKeys.TRANSLATE_STATS] || {};

    if (!stats[monthKey]) {
      stats[monthKey] = {
        totalChars: 0,
        totalCount: 0,
        lastUpdate: null
      };
    }

    stats[monthKey].totalChars += charCount;
    stats[monthKey].totalCount += 1;
    stats[monthKey].lastUpdate = new Date().toISOString();

    await chrome.storage.local.set({ [StorageKeys.TRANSLATE_STATS]: stats });
    console.log('[翻譯助手 BG] 統計已更新:', stats[monthKey]);
  } catch (error) {
    console.error('[翻譯助手 BG] 更新統計失敗:', error);
    throw error;
  }
}

async function getStats() {
  try {
    const result = await chrome.storage.local.get(StorageKeys.TRANSLATE_STATS);
    const stats = result[StorageKeys.TRANSLATE_STATS] || {};
    const monthKey = getCurrentMonthKey();

    return {
      currentMonth: monthKey,
      currentMonthStats: stats[monthKey] || { totalChars: 0, totalCount: 0 },
      allStats: stats
    };
  } catch (error) {
    console.error('[翻譯助手 BG] 取得統計失敗:', error);
    throw error;
  }
}

// ==================== 單字本功能 ====================

async function addVocabulary(word) {
  try {
    const result = await chrome.storage.local.get(StorageKeys.VOCABULARY);
    const vocabulary = result[StorageKeys.VOCABULARY] || [];

    const exists = vocabulary.some(item =>
      item.en.toLowerCase() === word.en.toLowerCase()
    );

    if (exists) {
      console.log('[翻譯助手 BG] 單字已存在:', word.en);
      return;
    }

    vocabulary.unshift({
      en: word.en,
      zh: word.zh,
      context: word.context || '',
      addedAt: new Date().toISOString()
    });

    await chrome.storage.local.set({ [StorageKeys.VOCABULARY]: vocabulary });
    console.log('[翻譯助手 BG] 單字已加入:', word.en);
  } catch (error) {
    console.error('[翻譯助手 BG] 新增單字失敗:', error);
    throw error;
  }
}

async function getVocabulary() {
  try {
    const result = await chrome.storage.local.get(StorageKeys.VOCABULARY);
    return result[StorageKeys.VOCABULARY] || [];
  } catch (error) {
    console.error('[翻譯助手 BG] 取得單字本失敗:', error);
    throw error;
  }
}

async function removeVocabulary(index) {
  try {
    const result = await chrome.storage.local.get(StorageKeys.VOCABULARY);
    const vocabulary = result[StorageKeys.VOCABULARY] || [];

    if (index >= 0 && index < vocabulary.length) {
      vocabulary.splice(index, 1);
      await chrome.storage.local.set({ [StorageKeys.VOCABULARY]: vocabulary });
      console.log('[翻譯助手 BG] 單字已移除, index:', index);
    }
  } catch (error) {
    console.error('[翻譯助手 BG] 移除單字失敗:', error);
    throw error;
  }
}

async function clearVocabulary() {
  try {
    await chrome.storage.local.set({ [StorageKeys.VOCABULARY]: [] });
    console.log('[翻譯助手 BG] 單字本已清空');
  } catch (error) {
    console.error('[翻譯助手 BG] 清空單字本失敗:', error);
    throw error;
  }
}

// ==================== Service Worker 事件 ====================

self.addEventListener('install', (event) => {
  console.log('[翻譯助手 BG] Service Worker 安裝完成');
});

self.addEventListener('activate', (event) => {
  console.log('[翻譯助手 BG] Service Worker 已啟動');
});
