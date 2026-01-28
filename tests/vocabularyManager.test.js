/**
 * VocabularyManager 模組測試
 */

const {
  addVocabulary,
  getVocabulary,
  removeVocabulary,
  clearVocabulary,
  searchVocabulary
} = require('../src/shared/vocabularyManager');

describe('VocabularyManager', () => {
  const storage = global.chrome.storage.local;

  beforeEach(() => {
    global.resetMockStorage();
  });

  describe('addVocabulary', () => {
    test('should add new word successfully', async () => {
      const word = { en: 'Hello', zh: '你好' };
      const result = await addVocabulary(word, storage);

      expect(result.added).toBe(true);
      expect(result.word.en).toBe('Hello');
      expect(result.word.zh).toBe('你好');
      expect(result.word.addedAt).toBeDefined();
    });

    test('should add word with context', async () => {
      const word = { en: 'Hello', zh: '你好', context: 'greeting' };
      const result = await addVocabulary(word, storage);

      expect(result.word.context).toBe('greeting');
    });

    test('should not add duplicate word (case insensitive)', async () => {
      const word1 = { en: 'Hello', zh: '你好' };
      const word2 = { en: 'hello', zh: '哈囉' };

      await addVocabulary(word1, storage);
      const result = await addVocabulary(word2, storage);

      expect(result.added).toBe(false);
      expect(result.reason).toBe('duplicate');
    });

    test('should add words to the beginning of the list', async () => {
      await addVocabulary({ en: 'First', zh: '第一' }, storage);
      await addVocabulary({ en: 'Second', zh: '第二' }, storage);

      const vocabulary = await getVocabulary(storage);
      expect(vocabulary[0].en).toBe('Second');
      expect(vocabulary[1].en).toBe('First');
    });

    test('should throw error for missing en property', async () => {
      await expect(addVocabulary({ zh: '你好' }, storage)).rejects.toThrow();
    });

    test('should throw error for missing zh property', async () => {
      await expect(addVocabulary({ en: 'Hello' }, storage)).rejects.toThrow();
    });

    test('should throw error for null word', async () => {
      await expect(addVocabulary(null, storage)).rejects.toThrow();
    });

    test('should use provided date for addedAt', async () => {
      const date = new Date('2026-01-15T10:30:00Z');
      const result = await addVocabulary(
        { en: 'Test', zh: '測試' },
        storage,
        date
      );

      expect(result.word.addedAt).toBe(date.toISOString());
    });

    test('should handle empty context', async () => {
      const word = { en: 'Test', zh: '測試', context: '' };
      const result = await addVocabulary(word, storage);

      expect(result.word.context).toBe('');
    });
  });

  describe('getVocabulary', () => {
    test('should return empty array when no words exist', async () => {
      const result = await getVocabulary(storage);
      expect(result).toEqual([]);
    });

    test('should return all words', async () => {
      await addVocabulary({ en: 'Hello', zh: '你好' }, storage);
      await addVocabulary({ en: 'World', zh: '世界' }, storage);

      const result = await getVocabulary(storage);
      expect(result).toHaveLength(2);
    });

    test('should preserve word order', async () => {
      await addVocabulary({ en: 'First', zh: '第一' }, storage);
      await addVocabulary({ en: 'Second', zh: '第二' }, storage);
      await addVocabulary({ en: 'Third', zh: '第三' }, storage);

      const result = await getVocabulary(storage);
      expect(result[0].en).toBe('Third');
      expect(result[1].en).toBe('Second');
      expect(result[2].en).toBe('First');
    });
  });

  describe('removeVocabulary', () => {
    test('should remove word at index', async () => {
      await addVocabulary({ en: 'First', zh: '第一' }, storage);
      await addVocabulary({ en: 'Second', zh: '第二' }, storage);

      const result = await removeVocabulary(0, storage);

      expect(result.removed).toBe(true);
      expect(result.word.en).toBe('Second');

      const vocabulary = await getVocabulary(storage);
      expect(vocabulary).toHaveLength(1);
      expect(vocabulary[0].en).toBe('First');
    });

    test('should return false for out of range index', async () => {
      await addVocabulary({ en: 'Test', zh: '測試' }, storage);

      const result = await removeVocabulary(5, storage);

      expect(result.removed).toBe(false);
      expect(result.reason).toBe('index_out_of_range');
    });

    test('should throw error for negative index', async () => {
      await expect(removeVocabulary(-1, storage)).rejects.toThrow();
    });

    test('should throw error for non-number index', async () => {
      await expect(removeVocabulary('0', storage)).rejects.toThrow();
    });

    test('should handle removing last item', async () => {
      await addVocabulary({ en: 'Only', zh: '唯一' }, storage);

      const result = await removeVocabulary(0, storage);

      expect(result.removed).toBe(true);
      const vocabulary = await getVocabulary(storage);
      expect(vocabulary).toHaveLength(0);
    });

    test('should return the removed word', async () => {
      await addVocabulary({ en: 'Test', zh: '測試', context: 'example' }, storage);

      const result = await removeVocabulary(0, storage);

      expect(result.word.en).toBe('Test');
      expect(result.word.zh).toBe('測試');
      expect(result.word.context).toBe('example');
    });
  });

  describe('clearVocabulary', () => {
    test('should clear all words', async () => {
      await addVocabulary({ en: 'Hello', zh: '你好' }, storage);
      await addVocabulary({ en: 'World', zh: '世界' }, storage);

      const count = await clearVocabulary(storage);

      expect(count).toBe(2);
      const vocabulary = await getVocabulary(storage);
      expect(vocabulary).toHaveLength(0);
    });

    test('should return 0 when vocabulary is already empty', async () => {
      const count = await clearVocabulary(storage);
      expect(count).toBe(0);
    });

    test('should handle large vocabulary', async () => {
      for (let i = 0; i < 100; i++) {
        await addVocabulary({ en: `Word${i}`, zh: `字${i}` }, storage);
      }

      const count = await clearVocabulary(storage);
      expect(count).toBe(100);
    });
  });

  describe('searchVocabulary', () => {
    beforeEach(async () => {
      await addVocabulary({ en: 'Hello World', zh: '你好世界' }, storage);
      await addVocabulary({ en: 'Good Morning', zh: '早安' }, storage);
      await addVocabulary({ en: 'Hello There', zh: '哈囉' }, storage);
    });

    test('should search by English word', async () => {
      const result = await searchVocabulary('Hello', storage);
      expect(result).toHaveLength(2);
    });

    test('should search by Chinese word', async () => {
      const result = await searchVocabulary('你好', storage);
      expect(result).toHaveLength(1);
      expect(result[0].en).toBe('Hello World');
    });

    test('should be case insensitive for English', async () => {
      const result = await searchVocabulary('hello', storage);
      expect(result).toHaveLength(2);
    });

    test('should return all words for empty query', async () => {
      const result = await searchVocabulary('', storage);
      expect(result).toHaveLength(3);
    });

    test('should return all words for null query', async () => {
      const result = await searchVocabulary(null, storage);
      expect(result).toHaveLength(3);
    });

    test('should return empty array for no matches', async () => {
      const result = await searchVocabulary('xyz', storage);
      expect(result).toHaveLength(0);
    });

    test('should search partial matches', async () => {
      const result = await searchVocabulary('orld', storage);
      expect(result).toHaveLength(1);
      expect(result[0].en).toBe('Hello World');
    });

    test('should handle whitespace in query', async () => {
      const result = await searchVocabulary('  Hello  ', storage);
      expect(result).toHaveLength(2);
    });
  });
});
