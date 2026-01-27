/**
 * 中英翻譯助手 - Background Script
 * 負責處理翻譯 API 請求，避免 CORS 限制
 */

// 監聽來自 content script 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translateText(request.text, request.sourceLang, request.targetLang)
      .then(result => {
        sendResponse({ success: true, translatedText: result });
      })
      .catch(error => {
        console.error('翻譯錯誤:', error);
        sendResponse({ success: false, error: error.message });
      });

    // 返回 true 表示會異步發送回應
    return true;
  }
});

/**
 * 呼叫 Google 翻譯 API
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼 (例如: 'zh-TW', 'auto')
 * @param {string} targetLang - 目標語言代碼 (例如: 'en')
 * @returns {Promise<string>} - 翻譯後的文字
 */
async function translateText(text, sourceLang = 'auto', targetLang = 'en') {
  const url = new URL('https://translate.googleapis.com/translate_a/single');

  // 設定查詢參數
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', sourceLang);  // source language
  url.searchParams.set('tl', targetLang);  // target language
  url.searchParams.set('dt', 't');         // 返回翻譯文字
  url.searchParams.set('q', text);         // 要翻譯的文字

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 解析回應格式: [[["翻譯結果","原文",...],...],...]
    // 翻譯結果在 data[0] 陣列中，每個元素的第一個值是翻譯片段
    if (data && data[0]) {
      let translatedText = '';
      for (const segment of data[0]) {
        if (segment[0]) {
          translatedText += segment[0];
        }
      }
      return translatedText;
    }

    throw new Error('無法解析翻譯結果');
  } catch (error) {
    console.error('翻譯 API 錯誤:', error);
    throw error;
  }
}
