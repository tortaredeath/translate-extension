/**
 * 單字本管理模組
 * 處理單字的新增、刪除、查詢
 */

/**
 * 新增單字到單字本
 * @param {Object} word - 單字物件 { en, zh, context }
 * @param {Object} storage - chrome.storage.local 或 mock
 * @param {Date} [date] - 可選的日期（用於 addedAt）
 * @returns {Promise<Object>} { added: boolean, word: Object }
 */
async function addVocabulary(word, storage, date = new Date()) {
  if (!word || !word.en || !word.zh) {
    throw new Error('word must have en and zh properties');
  }

  const result = await storage.get('vocabulary');
  const vocabulary = result.vocabulary || [];

  // 檢查是否已存在
  const exists = vocabulary.some(item =>
    item.en.toLowerCase() === word.en.toLowerCase()
  );

  if (exists) {
    return { added: false, word: null, reason: 'duplicate' };
  }

  const newWord = {
    en: word.en,
    zh: word.zh,
    context: word.context || '',
    addedAt: date.toISOString()
  };

  vocabulary.unshift(newWord);
  await storage.set({ vocabulary });

  return { added: true, word: newWord };
}

/**
 * 取得單字本
 * @param {Object} storage
 * @returns {Promise<Array>}
 */
async function getVocabulary(storage) {
  const result = await storage.get('vocabulary');
  return result.vocabulary || [];
}

/**
 * 移除單字
 * @param {number} index - 要移除的索引
 * @param {Object} storage
 * @returns {Promise<Object>} { removed: boolean, word: Object|null }
 */
async function removeVocabulary(index, storage) {
  if (typeof index !== 'number' || index < 0) {
    throw new Error('index must be a non-negative number');
  }

  const result = await storage.get('vocabulary');
  const vocabulary = result.vocabulary || [];

  if (index >= vocabulary.length) {
    return { removed: false, word: null, reason: 'index_out_of_range' };
  }

  const removed = vocabulary.splice(index, 1)[0];
  await storage.set({ vocabulary });

  return { removed: true, word: removed };
}

/**
 * 清空單字本
 * @param {Object} storage
 * @returns {Promise<number>} 清除的單字數量
 */
async function clearVocabulary(storage) {
  const result = await storage.get('vocabulary');
  const vocabulary = result.vocabulary || [];
  const count = vocabulary.length;

  await storage.set({ vocabulary: [] });

  return count;
}

/**
 * 搜尋單字
 * @param {string} query - 搜尋關鍵字
 * @param {Object} storage
 * @returns {Promise<Array>}
 */
async function searchVocabulary(query, storage) {
  if (!query || typeof query !== 'string') {
    return getVocabulary(storage);
  }

  const vocabulary = await getVocabulary(storage);
  const lowerQuery = query.toLowerCase().trim();

  return vocabulary.filter(word =>
    word.en.toLowerCase().includes(lowerQuery) ||
    word.zh.includes(query)
  );
}

// 匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addVocabulary,
    getVocabulary,
    removeVocabulary,
    clearVocabulary,
    searchVocabulary
  };
}
