/**
 * 翻譯 API
 */

/**
 * 呼叫 Google 翻譯 API
 */
export async function translateText(text, sourceLang = 'auto', targetLang = 'en') {
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
