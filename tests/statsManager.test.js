/**
 * StatsManager 模組測試
 */

const {
  getCurrentMonthKey,
  updateStats,
  getStats,
  clearStats
} = require('../src/shared/statsManager');

describe('StatsManager', () => {
  // Use the mocked chrome.storage.local from setup.js
  const storage = global.chrome.storage.local;

  beforeEach(() => {
    global.resetMockStorage();
  });

  describe('getCurrentMonthKey', () => {
    test('should return current month key', () => {
      const result = getCurrentMonthKey();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    test('should return correct key for specific date', () => {
      const date = new Date('2026-06-15');
      expect(getCurrentMonthKey(date)).toBe('2026-06');
    });
  });

  describe('updateStats', () => {
    test('should create new stats for new month', async () => {
      const date = new Date('2026-01-15');
      const result = await updateStats(100, storage, date);

      expect(result.totalChars).toBe(100);
      expect(result.totalCount).toBe(1);
      expect(result.lastUpdate).toBe(date.toISOString());
    });

    test('should accumulate stats for same month', async () => {
      const date = new Date('2026-01-15');

      await updateStats(100, storage, date);
      const result = await updateStats(50, storage, date);

      expect(result.totalChars).toBe(150);
      expect(result.totalCount).toBe(2);
    });

    test('should keep separate stats for different months', async () => {
      const jan = new Date('2026-01-15');
      const feb = new Date('2026-02-15');

      await updateStats(100, storage, jan);
      await updateStats(200, storage, feb);

      const janStats = await getStats(storage, jan);
      const febStats = await getStats(storage, feb);

      expect(janStats.currentMonthStats.totalChars).toBe(100);
      expect(febStats.currentMonthStats.totalChars).toBe(200);
    });

    test('should throw error for negative charCount', async () => {
      await expect(updateStats(-1, storage)).rejects.toThrow();
    });

    test('should throw error for non-number charCount', async () => {
      await expect(updateStats('100', storage)).rejects.toThrow();
    });

    test('should handle zero charCount', async () => {
      const result = await updateStats(0, storage);
      expect(result.totalChars).toBe(0);
      expect(result.totalCount).toBe(1);
    });

    test('should handle large charCount', async () => {
      const result = await updateStats(1000000, storage);
      expect(result.totalChars).toBe(1000000);
    });
  });

  describe('getStats', () => {
    test('should return empty stats for new month', async () => {
      const result = await getStats(storage);

      expect(result.currentMonthStats.totalChars).toBe(0);
      expect(result.currentMonthStats.totalCount).toBe(0);
    });

    test('should return existing stats', async () => {
      const date = new Date('2026-01-15');
      await updateStats(500, storage, date);

      const result = await getStats(storage, date);

      expect(result.currentMonth).toBe('2026-01');
      expect(result.currentMonthStats.totalChars).toBe(500);
      expect(result.currentMonthStats.totalCount).toBe(1);
    });

    test('should include all stats in allStats', async () => {
      const jan = new Date('2026-01-15');
      const feb = new Date('2026-02-15');
      const mar = new Date('2026-03-15');

      await updateStats(100, storage, jan);
      await updateStats(200, storage, feb);
      await updateStats(300, storage, mar);

      const result = await getStats(storage, mar);

      expect(Object.keys(result.allStats)).toHaveLength(3);
      expect(result.allStats['2026-01'].totalChars).toBe(100);
      expect(result.allStats['2026-02'].totalChars).toBe(200);
      expect(result.allStats['2026-03'].totalChars).toBe(300);
    });
  });

  describe('clearStats', () => {
    test('should clear all stats', async () => {
      await updateStats(100, storage);
      await clearStats(storage);

      const result = await getStats(storage);
      expect(Object.keys(result.allStats)).toHaveLength(0);
    });

    test('should work when stats are already empty', async () => {
      await clearStats(storage);
      const result = await getStats(storage);
      expect(Object.keys(result.allStats)).toHaveLength(0);
    });
  });
});
