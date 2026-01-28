/**
 * 共用常數定義
 */

// 消息 Action 類型
export const MessageActions = {
  TRANSLATE: 'translate',
  UPDATE_STATS: 'updateStats',
  GET_STATS: 'getStats',
  ADD_VOCABULARY: 'addVocabulary',
  GET_VOCABULARY: 'getVocabulary',
  REMOVE_VOCABULARY: 'removeVocabulary',
  CLEAR_VOCABULARY: 'clearVocabulary'
};

// Storage Keys
export const StorageKeys = {
  TRANSLATE_STATS: 'translateStats',
  VOCABULARY: 'vocabulary'
};

// 支援的 input types
export const SUPPORTED_INPUT_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''];

// 中文檢測正則
export const CHINESE_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/;

// 預設配置
export const DEFAULT_CONFIG = {
  selectionDelay: 30,
  debug: true
};

// 編輯器類型
export const EditorTypes = {
  GENERIC: 'generic',
  SLACK: 'slack',
  NOTION: 'notion',
  GMAIL: 'gmail'
};
