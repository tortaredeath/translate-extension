/**
 * Content Script 配置
 */

import { SUPPORTED_INPUT_TYPES, CHINESE_REGEX, DEFAULT_CONFIG } from '../shared/constants.js';

export const CONFIG = {
  supportedInputTypes: SUPPORTED_INPUT_TYPES,
  chineseRegex: CHINESE_REGEX,
  selectionDelay: DEFAULT_CONFIG.selectionDelay,
  debug: DEFAULT_CONFIG.debug
};

// 日誌工具
export function log(...args) {
  if (CONFIG.debug) {
    console.log('[翻譯助手]', ...args);
  }
}

export function logError(...args) {
  console.error('[翻譯助手]', ...args);
}
