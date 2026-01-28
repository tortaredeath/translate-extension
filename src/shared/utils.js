/**
 * 共用工具函數
 * 可在 background.js、content.js、popup.js 中使用
 */

/**
 * 取得當前月份的 key (格式: "2026-01")
 * @param {Date} [date] - 可選的日期，預設為當前時間
 * @returns {string}
 */
function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 格式化數字（加入千分位）
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  return num.toLocaleString('zh-TW');
}

/**
 * HTML 跳脫（防止 XSS）
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * 產生 CSV 內容
 * @param {Array} vocabulary - 單字陣列
 * @returns {string}
 */
function generateCSV(vocabulary) {
  const headers = ['English', 'Chinese', 'Context', 'Added Date'];
  const rows = vocabulary.map(word => [
    `"${(word.en || '').replace(/"/g, '""')}"`,
    `"${(word.zh || '').replace(/"/g, '""')}"`,
    `"${(word.context || '').replace(/"/g, '""')}"`,
    `"${word.addedAt || ''}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// 根據環境決定匯出方式
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCurrentMonthKey,
    formatNumber,
    escapeHtml,
    generateCSV
  };
}
