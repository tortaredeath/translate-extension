/**
 * 中英翻譯助手 - Popup Script
 * 處理統計顯示和單字本管理
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadStats();
  loadVocabulary();
  initEventListeners();
});

// ==================== 頁籤切換 ====================

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // 切換按鈕狀態
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 切換內容
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// ==================== 統計功能 ====================

async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });

    if (response.success) {
      const { currentMonth, currentMonthStats } = response.stats;

      // 更新數字
      document.getElementById('total-chars').textContent =
        formatNumber(currentMonthStats.totalChars || 0);
      document.getElementById('total-count').textContent =
        formatNumber(currentMonthStats.totalCount || 0);

      // 更新月份顯示
      const [year, month] = currentMonth.split('-');
      document.getElementById('current-month').textContent =
        `📅 ${year} 年 ${parseInt(month)} 月`;
    }
  } catch (error) {
    console.error('載入統計失敗:', error);
  }
}

function formatNumber(num) {
  return num.toLocaleString('zh-TW');
}

// ==================== 單字本功能 ====================

let allVocabulary = [];

async function loadVocabulary() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getVocabulary' });

    if (response.success) {
      allVocabulary = response.vocabulary || [];
      renderVocabulary(allVocabulary);
      updateWordCount(allVocabulary.length);
    }
  } catch (error) {
    console.error('載入單字本失敗:', error);
  }
}

function renderVocabulary(vocabulary) {
  const listEl = document.getElementById('vocabulary-list');
  const emptyEl = document.getElementById('empty-state');

  // 清空現有內容（保留空狀態元素）
  const items = listEl.querySelectorAll('.word-item');
  items.forEach(item => item.remove());

  if (vocabulary.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  vocabulary.forEach((word, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'word-item';
    itemEl.innerHTML = `
      <div class="word-content">
        <div class="word-en">${escapeHtml(word.en)}</div>
        <div class="word-zh">${escapeHtml(word.zh)}</div>
      </div>
      <button class="word-delete" data-index="${index}" title="刪除">🗑️</button>
    `;

    listEl.insertBefore(itemEl, emptyEl);
  });
}

function updateWordCount(count) {
  document.getElementById('word-count').textContent = count;
}

// ==================== 事件監聽 ====================

function initEventListeners() {
  // 搜尋
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
      renderVocabulary(allVocabulary);
      return;
    }

    const filtered = allVocabulary.filter(word =>
      word.en.toLowerCase().includes(query) ||
      word.zh.includes(query)
    );

    renderVocabulary(filtered);
  });

  // 刪除單字
  document.getElementById('vocabulary-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('word-delete')) {
      const index = parseInt(e.target.dataset.index);

      if (confirm('確定要刪除這個單字嗎？')) {
        try {
          await chrome.runtime.sendMessage({
            action: 'removeVocabulary',
            index: index
          });
          await loadVocabulary();
        } catch (error) {
          console.error('刪除失敗:', error);
        }
      }
    }
  });

  // 匯出
  document.getElementById('export-btn').addEventListener('click', () => {
    if (allVocabulary.length === 0) {
      alert('單字本是空的！');
      return;
    }

    const csv = generateCSV(allVocabulary);
    downloadFile(csv, 'vocabulary.csv', 'text/csv');
  });

  // 清空
  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (allVocabulary.length === 0) {
      alert('單字本已經是空的！');
      return;
    }

    if (confirm('確定要清空所有單字嗎？此操作無法復原。')) {
      try {
        await chrome.runtime.sendMessage({ action: 'clearVocabulary' });
        await loadVocabulary();
      } catch (error) {
        console.error('清空失敗:', error);
      }
    }
  });
}

// ==================== 工具函數 ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateCSV(vocabulary) {
  const headers = ['English', 'Chinese', 'Context', 'Added Date'];
  const rows = vocabulary.map(word => [
    `"${word.en.replace(/"/g, '""')}"`,
    `"${word.zh.replace(/"/g, '""')}"`,
    `"${(word.context || '').replace(/"/g, '""')}"`,
    `"${word.addedAt || ''}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function downloadFile(content, filename, type) {
  const blob = new Blob(['\ufeff' + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
