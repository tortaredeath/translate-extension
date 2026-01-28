/**
 * 中英翻譯助手 - Background Script (Service Worker) v2.0.0
 * 負責處理翻譯 API 請求、統計數據、單字本管理
 */

console.log('[翻譯助手 BG] Service Worker 已啟動');

// ==================== 訊息處理 ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[翻譯助手 BG] 收到訊息:', request.action);

  switch (request.action) {
    case 'translate':
      handleTranslate(request, sendResponse);
      return true; // 異步回應

    case 'updateStats':
      updateStats(request.charCount)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getStats':
      getStats()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'addVocabulary':
      addVocabulary(request.word)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getVocabulary':
      getVocabulary()
        .then(vocabulary => sendResponse({ success: true, vocabulary }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'removeVocabulary':
      removeVocabulary(request.index)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'clearVocabulary':
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

    // 更新統計（原文字數）
    const charCount = request.text?.length || 0;
    await updateStats(charCount);

    sendResponse({ success: true, translatedText: result });
  } catch (error) {
    console.error('[翻譯助手 BG] 翻譯錯誤:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 呼叫 Google 翻譯 API
 */
async function translateText(text, sourceLang = 'auto', targetLang = 'en') {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text
  });

  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text_response = await response.text();
    let data;
    try {
      data = JSON.parse(text_response);
    } catch (e) {
      throw new Error('無法解析 API 回應');
    }

    if (data && data[0]) {
      let translatedText = '';
      for (const segment of data[0]) {
        if (segment && segment[0]) {
          translatedText += segment[0];
        }
      }
      if (translatedText) {
        return translatedText;
      }
    }

    throw new Error('無法解析翻譯結果');
  } catch (error) {
    console.error('[翻譯助手 BG] 翻譯 API 錯誤:', error);
    throw error;
  }
}

// ==================== 統計功能 ====================

/**
 * 取得當前月份的 key (格式: "2026-01")
 */
function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 更新翻譯統計
 */
async function updateStats(charCount) {
  const monthKey = getCurrentMonthKey();

  try {
    const result = await chrome.storage.local.get('translateStats');
    const stats = result.translateStats || {};

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

    await chrome.storage.local.set({ translateStats: stats });
    console.log('[翻譯助手 BG] 統計已更新:', stats[monthKey]);
  } catch (error) {
    console.error('[翻譯助手 BG] 更新統計失敗:', error);
    throw error;
  }
}

/**
 * 取得統計數據
 */
async function getStats() {
  try {
    const result = await chrome.storage.local.get('translateStats');
    const stats = result.translateStats || {};
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

/**
 * 新增單字到單字本
 */
async function addVocabulary(word) {
  try {
    const result = await chrome.storage.local.get('vocabulary');
    const vocabulary = result.vocabulary || [];

    // 檢查是否已存在（根據英文單字判斷）
    const exists = vocabulary.some(item =>
      item.en.toLowerCase() === word.en.toLowerCase()
    );

    if (exists) {
      console.log('[翻譯助手 BG] 單字已存在:', word.en);
      return; // 已存在則不重複加入
    }

    vocabulary.unshift({
      en: word.en,
      zh: word.zh,
      context: word.context || '',
      addedAt: new Date().toISOString()
    });

    await chrome.storage.local.set({ vocabulary });
    console.log('[翻譯助手 BG] 單字已加入:', word.en);
  } catch (error) {
    console.error('[翻譯助手 BG] 新增單字失敗:', error);
    throw error;
  }
}

/**
 * 取得單字本
 */
async function getVocabulary() {
  try {
    const result = await chrome.storage.local.get('vocabulary');
    return result.vocabulary || [];
  } catch (error) {
    console.error('[翻譯助手 BG] 取得單字本失敗:', error);
    throw error;
  }
}

/**
 * 移除單字
 */
async function removeVocabulary(index) {
  try {
    const result = await chrome.storage.local.get('vocabulary');
    const vocabulary = result.vocabulary || [];

    if (index >= 0 && index < vocabulary.length) {
      vocabulary.splice(index, 1);
      await chrome.storage.local.set({ vocabulary });
      console.log('[翻譯助手 BG] 單字已移除, index:', index);
    }
  } catch (error) {
    console.error('[翻譯助手 BG] 移除單字失敗:', error);
    throw error;
  }
}

/**
 * 清空單字本
 */
async function clearVocabulary() {
  try {
    await chrome.storage.local.set({ vocabulary: [] });
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
