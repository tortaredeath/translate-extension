/**
 * 統計管理模組
 * 處理翻譯統計的存取
 */

// 引入工具函數（在瀏覽器環境中這些函數會在全域）
let utils;
if (typeof module !== 'undefined' && module.exports) {
  utils = require('./utils');
}

/**
 * 取得當前月份 key
 * @param {Date} [date]
 * @returns {string}
 */
function getCurrentMonthKey(date = new Date()) {
  if (utils && utils.getCurrentMonthKey) {
    return utils.getCurrentMonthKey(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 更新翻譯統計
 * @param {number} charCount - 翻譯的字數
 * @param {Object} storage - chrome.storage.local 或 mock
 * @param {Date} [date] - 可選的日期
 * @returns {Promise<Object>} 更新後的統計
 */
async function updateStats(charCount, storage, date = new Date()) {
  if (typeof charCount !== 'number' || charCount < 0) {
    throw new Error('charCount must be a non-negative number');
  }

  const monthKey = getCurrentMonthKey(date);

  const result = await storage.get('translateStats');
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
  stats[monthKey].lastUpdate = date.toISOString();

  await storage.set({ translateStats: stats });

  return stats[monthKey];
}

/**
 * 取得統計數據
 * @param {Object} storage - chrome.storage.local 或 mock
 * @param {Date} [date] - 可選的日期
 * @returns {Promise<Object>}
 */
async function getStats(storage, date = new Date()) {
  const result = await storage.get('translateStats');
  const stats = result.translateStats || {};
  const monthKey = getCurrentMonthKey(date);

  return {
    currentMonth: monthKey,
    currentMonthStats: stats[monthKey] || { totalChars: 0, totalCount: 0 },
    allStats: stats
  };
}

/**
 * 清除所有統計
 * @param {Object} storage
 * @returns {Promise<void>}
 */
async function clearStats(storage) {
  await storage.set({ translateStats: {} });
}

// 匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCurrentMonthKey,
    updateStats,
    getStats,
    clearStats
  };
}
