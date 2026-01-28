/**
 * 翻譯文字提取與重組
 */

import { log } from '../config.js';

/**
 * 從文字中提取需要翻譯的部分，保留 emoji、符號、URL 等
 */
export function extractTranslatableText(text) {
  // 正則表達式匹配需要保留的部分
  const preservePatterns = [
    // Emoji
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FAFF}]/gu,
    // URL
    /https?:\/\/[^\s]+/g,
    // 項目符號
    /^[\s]*[•\-\*\→\›\»\◦\▪\▫\●\○\◉\◎\★\☆\✓\✔\✕\✖\✗\✘\➤\➜\➡\⟶\🔹\🔸\🔷\🔶\💠\♦\♢◆◇]+[\s]*/gm,
    // 數字列表
    /^[\s]*\d+[\.、\)]\s*/gm,
    // 程式碼區塊
    /```[\s\S]*?```/g,
    // 行內程式碼
    /`[^`]+`/g,
  ];

  const segments = [];

  // 找出所有需要保留的部分
  const preserveRanges = [];

  for (const pattern of preservePatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      preserveRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      });
    }
  }

  // 排序並合併重疊的範圍
  preserveRanges.sort((a, b) => a.start - b.start);
  const mergedRanges = [];
  for (const range of preserveRanges) {
    if (mergedRanges.length === 0 || range.start > mergedRanges[mergedRanges.length - 1].end) {
      mergedRanges.push({ ...range });
    } else {
      mergedRanges[mergedRanges.length - 1].end = Math.max(
        mergedRanges[mergedRanges.length - 1].end,
        range.end
      );
      mergedRanges[mergedRanges.length - 1].content = text.substring(
        mergedRanges[mergedRanges.length - 1].start,
        mergedRanges[mergedRanges.length - 1].end
      );
    }
  }

  // 建立分段
  let currentPos = 0;
  for (const range of mergedRanges) {
    if (currentPos < range.start) {
      const textPart = text.substring(currentPos, range.start);
      if (textPart.trim()) {
        segments.push({ type: 'text', content: textPart });
      } else if (textPart) {
        segments.push({ type: 'preserve', content: textPart });
      }
    }
    segments.push({ type: 'preserve', content: range.content });
    currentPos = range.end;
  }

  if (currentPos < text.length) {
    const textPart = text.substring(currentPos);
    if (textPart.trim()) {
      segments.push({ type: 'text', content: textPart });
    } else if (textPart) {
      segments.push({ type: 'preserve', content: textPart });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  // 按行分割
  const lines = text.split('\n');
  const lineInfos = lines.map(line => {
    const bulletMatch = line.match(/^([\s]*[•\-\*\→\›\»\◦\▪\▫\●\○\◉\◎\★\☆\✓\✔\✕\✖\✗\✘\➤\➜\➡\⟶\🔹\🔸\🔷\🔶\💠\♦\♢◆◇]+[\s]*)/);
    const numberMatch = line.match(/^([\s]*\d+[\.、\)]\s*)/);

    let prefix = '';
    let content = line;

    if (bulletMatch) {
      prefix = bulletMatch[1];
      content = line.substring(prefix.length);
    } else if (numberMatch) {
      prefix = numberMatch[1];
      content = line.substring(prefix.length);
    }

    return { prefix, content, original: line, hasContent: content.trim().length > 0 };
  });

  const textsToTranslate = lineInfos
    .filter(info => info.hasContent)
    .map(info => info.content);

  log('分段結果 - 總行數:', lines.length, '需翻譯行數:', textsToTranslate.length);

  return {
    segments,
    lineInfos,
    textToTranslate: textsToTranslate.join('\n'),
    separator: '\n',
    lineSeparator: null
  };
}

/**
 * 將翻譯結果重組回原始格式
 */
export function reassembleTranslation(segments, translatedText, separator, lineSeparator, lineInfos) {
  if (lineInfos && lineInfos.length > 0) {
    const translatedParts = translatedText.split('\n');
    let translatedIndex = 0;

    log('重組開始 - 翻譯行數:', translatedParts.length, '原始行數:', lineInfos.length);

    const resultLines = lineInfos.map((info, lineIdx) => {
      if (info.hasContent) {
        if (translatedIndex < translatedParts.length) {
          const translated = translatedParts[translatedIndex].trim();
          translatedIndex++;
          return info.prefix + translated;
        } else {
          return info.original;
        }
      } else {
        return info.original;
      }
    });

    return resultLines.join('\n');
  }

  // 舊邏輯（備用）
  const translatedParts = translatedText.split(separator);
  let translatedIndex = 0;

  const result = segments.map(segment => {
    if (segment.type === 'text' && translatedIndex < translatedParts.length) {
      return translatedParts[translatedIndex++].trim();
    }
    return segment.content;
  });

  return result.join('');
}
