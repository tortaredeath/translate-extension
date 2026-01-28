/**
 * 更新 manifest.json 到 dist 目錄
 * 調整檔案路徑指向建構後的檔案
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// 讀取原始 manifest
const manifestPath = join(rootDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

// 更新路徑（dist 中的檔案在同一層級，所以路徑保持不變）
// 但需要確保指向正確的建構輸出

// 寫入到 dist
const distManifestPath = join(rootDir, 'dist', 'manifest.json');
writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2));

console.log('✓ manifest.json 已複製到 dist/');
