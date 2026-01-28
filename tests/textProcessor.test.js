/**
 * TextProcessor 模組測試
 */

const {
  CONFIG,
  containsChinese,
  isSupportedInputType,
  extractTranslatableText,
  reassembleTranslation
} = require('../src/shared/textProcessor');

describe('TextProcessor', () => {
  describe('CONFIG', () => {
    test('should have supportedInputTypes array', () => {
      expect(CONFIG.supportedInputTypes).toBeInstanceOf(Array);
      expect(CONFIG.supportedInputTypes).toContain('text');
      expect(CONFIG.supportedInputTypes).toContain('search');
      expect(CONFIG.supportedInputTypes).toContain('email');
    });

    test('should have chineseRegex', () => {
      expect(CONFIG.chineseRegex).toBeInstanceOf(RegExp);
    });
  });

  describe('containsChinese', () => {
    test('should return true for Chinese text', () => {
      expect(containsChinese('你好')).toBe(true);
      expect(containsChinese('世界')).toBe(true);
      expect(containsChinese('測試')).toBe(true);
    });

    test('should return true for mixed Chinese and English', () => {
      expect(containsChinese('Hello 你好')).toBe(true);
      expect(containsChinese('Test測試123')).toBe(true);
    });

    test('should return false for English only', () => {
      expect(containsChinese('Hello World')).toBe(false);
      expect(containsChinese('Test 123')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(containsChinese('')).toBe(false);
    });

    test('should return false for null/undefined', () => {
      expect(containsChinese(null)).toBe(false);
      expect(containsChinese(undefined)).toBe(false);
    });

    test('should return false for numbers only', () => {
      expect(containsChinese('12345')).toBe(false);
    });

    test('should handle emojis without Chinese', () => {
      expect(containsChinese('Hello 👋')).toBe(false);
    });

    test('should handle emojis with Chinese', () => {
      expect(containsChinese('你好 👋')).toBe(true);
    });

    test('should detect traditional Chinese', () => {
      expect(containsChinese('繁體中文')).toBe(true);
    });

    test('should detect simplified Chinese', () => {
      expect(containsChinese('简体中文')).toBe(true);
    });
  });

  describe('isSupportedInputType', () => {
    test('should support text type', () => {
      expect(isSupportedInputType('text')).toBe(true);
    });

    test('should support search type', () => {
      expect(isSupportedInputType('search')).toBe(true);
    });

    test('should support email type', () => {
      expect(isSupportedInputType('email')).toBe(true);
    });

    test('should support url type', () => {
      expect(isSupportedInputType('url')).toBe(true);
    });

    test('should support tel type', () => {
      expect(isSupportedInputType('tel')).toBe(true);
    });

    test('should support password type', () => {
      expect(isSupportedInputType('password')).toBe(true);
    });

    test('should support number type', () => {
      expect(isSupportedInputType('number')).toBe(true);
    });

    test('should support empty type (defaults to text)', () => {
      expect(isSupportedInputType('')).toBe(true);
    });

    test('should handle null (defaults to text)', () => {
      expect(isSupportedInputType(null)).toBe(true);
    });

    test('should handle uppercase types', () => {
      expect(isSupportedInputType('TEXT')).toBe(true);
      expect(isSupportedInputType('Email')).toBe(true);
    });

    test('should not support checkbox', () => {
      expect(isSupportedInputType('checkbox')).toBe(false);
    });

    test('should not support radio', () => {
      expect(isSupportedInputType('radio')).toBe(false);
    });

    test('should not support file', () => {
      expect(isSupportedInputType('file')).toBe(false);
    });
  });

  describe('extractTranslatableText', () => {
    test('should handle empty input', () => {
      const result = extractTranslatableText('');
      expect(result.textToTranslate).toBe('');
      expect(result.segments).toHaveLength(0);
    });

    test('should handle null input', () => {
      const result = extractTranslatableText(null);
      expect(result.textToTranslate).toBe('');
    });

    test('should extract simple Chinese text', () => {
      const result = extractTranslatableText('你好世界');
      expect(result.textToTranslate).toBe('你好世界');
    });

    test('should preserve URLs', () => {
      const text = '請訪問 https://example.com 獲取更多資訊';
      const result = extractTranslatableText(text);
      expect(result.segments.some(s =>
        s.type === 'preserve' && s.content.includes('https://example.com')
      )).toBe(true);
    });

    test('should preserve inline code', () => {
      const text = '使用 `console.log()` 函數';
      const result = extractTranslatableText(text);
      expect(result.segments.some(s =>
        s.type === 'preserve' && s.content === '`console.log()`'
      )).toBe(true);
    });

    test('should preserve code blocks', () => {
      const text = '範例：\n```\ncode here\n```';
      const result = extractTranslatableText(text);
      expect(result.segments.some(s =>
        s.type === 'preserve' && s.content.includes('```')
      )).toBe(true);
    });

    test('should preserve bullet points', () => {
      const text = '• 第一項\n• 第二項';
      const result = extractTranslatableText(text);
      expect(result.lineInfos[0].prefix).toBe('• ');
      expect(result.lineInfos[1].prefix).toBe('• ');
    });

    test('should preserve numbered lists', () => {
      const text = '1. 第一項\n2. 第二項';
      const result = extractTranslatableText(text);
      expect(result.lineInfos[0].prefix).toBe('1. ');
      expect(result.lineInfos[1].prefix).toBe('2. ');
    });

    test('should handle multiline text', () => {
      const text = '第一行\n第二行\n第三行';
      const result = extractTranslatableText(text);
      expect(result.lineInfos).toHaveLength(3);
      expect(result.lineInfos[0].content).toBe('第一行');
      expect(result.lineInfos[1].content).toBe('第二行');
      expect(result.lineInfos[2].content).toBe('第三行');
    });

    test('should handle mixed content', () => {
      const text = '• 請看這裡 https://test.com\n• 使用 `code` 範例';
      const result = extractTranslatableText(text);
      expect(result.lineInfos).toHaveLength(2);
    });
  });

  describe('reassembleTranslation', () => {
    test('should reassemble simple translation', () => {
      const lineInfos = [
        { prefix: '', content: '你好', original: '你好', hasContent: true }
      ];
      const result = reassembleTranslation([], 'Hello', '\n', null, lineInfos);
      expect(result).toBe('Hello');
    });

    test('should preserve bullet points', () => {
      const lineInfos = [
        { prefix: '• ', content: '第一項', original: '• 第一項', hasContent: true },
        { prefix: '• ', content: '第二項', original: '• 第二項', hasContent: true }
      ];
      const result = reassembleTranslation([], 'First item\nSecond item', '\n', null, lineInfos);
      expect(result).toBe('• First item\n• Second item');
    });

    test('should preserve numbered lists', () => {
      const lineInfos = [
        { prefix: '1. ', content: '項目一', original: '1. 項目一', hasContent: true },
        { prefix: '2. ', content: '項目二', original: '2. 項目二', hasContent: true }
      ];
      const result = reassembleTranslation([], 'Item one\nItem two', '\n', null, lineInfos);
      expect(result).toBe('1. Item one\n2. Item two');
    });

    test('should handle empty lines', () => {
      const lineInfos = [
        { prefix: '', content: '第一行', original: '第一行', hasContent: true },
        { prefix: '', content: '', original: '', hasContent: false },
        { prefix: '', content: '第三行', original: '第三行', hasContent: true }
      ];
      const result = reassembleTranslation([], 'First line\nThird line', '\n', null, lineInfos);
      expect(result).toBe('First line\n\nThird line');
    });

    test('should handle empty translated text', () => {
      const result = reassembleTranslation([], '', '\n', null, []);
      expect(result).toBe('');
    });

    test('should handle null translated text', () => {
      const result = reassembleTranslation([], null, '\n', null, []);
      expect(result).toBe('');
    });

    test('should use fallback when translation parts are insufficient', () => {
      const lineInfos = [
        { prefix: '', content: '第一行', original: '第一行', hasContent: true },
        { prefix: '', content: '第二行', original: '第二行', hasContent: true },
        { prefix: '', content: '第三行', original: '第三行', hasContent: true }
      ];
      // Only provide 2 translated parts for 3 lines
      const result = reassembleTranslation([], 'First\nSecond', '\n', null, lineInfos);
      expect(result).toBe('First\nSecond\n第三行');
    });
  });
});
