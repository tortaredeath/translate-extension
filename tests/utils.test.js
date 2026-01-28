/**
 * Utils 模組測試
 */

const {
  getCurrentMonthKey,
  formatNumber,
  escapeHtml,
  generateCSV
} = require('../src/shared/utils');

describe('Utils', () => {
  describe('getCurrentMonthKey', () => {
    test('should return current month key in YYYY-MM format', () => {
      const result = getCurrentMonthKey();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    test('should return correct key for specific date', () => {
      const date = new Date('2026-01-15');
      expect(getCurrentMonthKey(date)).toBe('2026-01');
    });

    test('should pad single digit months with zero', () => {
      const date = new Date('2026-03-01');
      expect(getCurrentMonthKey(date)).toBe('2026-03');
    });

    test('should handle December correctly', () => {
      const date = new Date('2025-12-25');
      expect(getCurrentMonthKey(date)).toBe('2025-12');
    });

    test('should handle January correctly', () => {
      const date = new Date('2026-01-01');
      expect(getCurrentMonthKey(date)).toBe('2026-01');
    });
  });

  describe('formatNumber', () => {
    test('should format number with thousands separator', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    test('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    test('should handle small numbers', () => {
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    test('should handle decimal numbers', () => {
      const result = formatNumber(1234.56);
      expect(result).toContain('1,234');
    });
  });

  describe('escapeHtml', () => {
    test('should escape ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('should escape less than', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    });

    test('should escape greater than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    test('should escape double quotes', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    test('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    test('should handle multiple special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    test('should not modify safe text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    test('should handle Chinese characters', () => {
      expect(escapeHtml('你好世界')).toBe('你好世界');
    });
  });

  describe('generateCSV', () => {
    test('should generate CSV with headers', () => {
      const vocabulary = [];
      const csv = generateCSV(vocabulary);
      expect(csv).toBe('English,Chinese,Context,Added Date');
    });

    test('should generate CSV with single word', () => {
      const vocabulary = [
        { en: 'Hello', zh: '你好', context: '', addedAt: '2026-01-01' }
      ];
      const csv = generateCSV(vocabulary);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('English,Chinese,Context,Added Date');
      expect(lines[1]).toBe('"Hello","你好","","2026-01-01"');
    });

    test('should generate CSV with multiple words', () => {
      const vocabulary = [
        { en: 'Hello', zh: '你好', context: 'greeting', addedAt: '2026-01-01' },
        { en: 'World', zh: '世界', context: '', addedAt: '2026-01-02' }
      ];
      const csv = generateCSV(vocabulary);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);
    });

    test('should escape double quotes in CSV', () => {
      const vocabulary = [
        { en: 'Say "Hi"', zh: '說"嗨"', context: '', addedAt: '2026-01-01' }
      ];
      const csv = generateCSV(vocabulary);
      expect(csv).toContain('""Hi""');
      expect(csv).toContain('""嗨""');
    });

    test('should handle missing fields', () => {
      const vocabulary = [
        { en: 'Test', zh: '測試' }
      ];
      const csv = generateCSV(vocabulary);
      expect(csv).toContain('"Test"');
      expect(csv).toContain('"測試"');
      expect(csv).toContain('""'); // empty context and addedAt
    });
  });
});
