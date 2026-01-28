# 網頁輸入框類型分析報告

## 目前擴充功能支援狀況

### ✅ 已支援
| 類型 | 範例 | 技術 |
|------|------|------|
| 標準 input | Google 搜尋框、登入表單 | `selectionStart/End` |
| 標準 textarea | 留言區、簡單文字編輯 | `selectionStart/End` |
| 簡單 contenteditable | 部分網站的編輯區 | `Selection API` + `Range` |

### ❌ 尚未支援
| 類型 | 範例 | 技術挑戰 |
|------|------|---------|
| Canvas 渲染編輯器 | Google Docs, Sheets, Office Online | 完全自訂渲染，無法用標準 API |
| React/Vue 狀態驅動 | Notion, Facebook, Slack | 需觸發框架狀態更新 |
| iframe 內嵌編輯器 | Gmail, TinyMCE | 跨域限制、需進入 iframe |
| Monaco Editor | VS Code Web | 使用專屬 API |
| Shadow DOM | 部分 Web Components | 需穿透 Shadow Root |

---

## 各平台詳細分析

### 1. Gmail 郵件編輯器 ❌
```
技術：iframe + contenteditable
結構：<iframe> → <div contenteditable="true">
挑戰：
  - 編輯區域在 iframe 內
  - Content Script 無法直接存取 iframe 內容
  - 需要額外權限或注入腳本到 iframe
```

### 2. Google Docs ❌
```
技術：Canvas 渲染
結構：<canvas> + 隱藏的輸入捕獲層
挑戰：
  - 文字繪製在 Canvas 上，不是 DOM 節點
  - 選取是自訂實作，非瀏覽器原生
  - 無法使用 Selection API
  - 完全無法透過 DOM 操作文字
```

### 3. Google Sheets ❌
```
技術：Canvas 渲染 + 浮動編輯框
結構：<canvas> + 編輯時的 <input>
挑戰：
  - 與 Google Docs 相同，主要內容在 Canvas
  - 編輯框短暫出現，難以穩定操作
```

### 4. Notion ⚠️ 部分可能
```
技術：React + 區塊式 contenteditable
結構：多個 <div contenteditable="true"> 區塊
挑戰：
  - 每個區塊是獨立的 contenteditable
  - React 狀態與 DOM 需同步
  - 直接修改 DOM 可能被 React 覆蓋
解決方案：
  - 使用 InputEvent 觸發 React 更新
  - execCommand 可能有效
```

### 5. Slack ⚠️ 部分可能
```
技術：Quill 編輯器 (contenteditable)
結構：<div class="ql-editor" contenteditable="true">
挑戰：
  - Quill 使用 Delta 資料模型
  - 直接 DOM 操作可能導致狀態不同步
解決方案：
  - execCommand('insertText') 可能有效
  - 需觸發適當的事件讓 Quill 同步
```

### 6. Microsoft Office Online ❌
```
技術：Canvas 渲染（類似 Google Docs）
挑戰：與 Google Docs 相同
```

### 7. Facebook / Twitter / LinkedIn ⚠️ 部分可能
```
技術：Draft.js / contenteditable
結構：<div contenteditable="true">
挑戰：
  - 框架控制的 contenteditable
  - 需正確觸發事件讓框架同步
解決方案：
  - execCommand + InputEvent
  - 需測試各平台
```

### 8. Medium ⚠️ 部分可能
```
技術：contenteditable
結構：<article contenteditable="true">
挑戰：
  - 區塊式結構
  - 內部狀態管理
解決方案：
  - Selection API + execCommand
```

### 9. VS Code Web / Monaco Editor ❌
```
技術：隱藏 textarea + DOM 渲染
挑戰：
  - 完全自訂的輸入處理
  - 需使用 Monaco Editor API
  - Content Script 無法存取 API
```

---

## 技術解決方案建議

### 優先級 1：改進 contenteditable 支援
```javascript
// 需要改進的地方：
1. 使用 execCommand('insertText') 作為主要方法
2. 正確觸發 InputEvent 讓框架同步
3. 處理 React/Vue 的狀態更新機制
```

### 優先級 2：支援 iframe 內嵌編輯器
```javascript
// Gmail 等使用 iframe 的編輯器
解決方案：
1. 在 manifest.json 中設定 all_frames: true
2. 讓 content script 也注入到 iframe 中
3. 使用 window.postMessage 跨 frame 通訊
```

### 優先級 3：無法支援的類型
```
Canvas 渲染（Google Docs/Sheets/Office Online）：
- 技術上無法透過 DOM 操作
- 需要這些應用提供官方 API 或外掛系統
- 建議：顯示提示告知使用者此類編輯器不支援
```

---

## 改進計畫

### Phase 1: 優化現有支援
- [ ] 改進 execCommand 使用方式
- [ ] 加強 InputEvent 觸發機制
- [ ] 測試更多網站相容性

### Phase 2: 擴展支援範圍
- [ ] 支援 iframe 內嵌編輯器（Gmail）
- [ ] 支援 Shadow DOM
- [ ] 測試主流社群媒體平台

### Phase 3: 處理邊緣情況
- [ ] 對不支援的編輯器顯示友善提示
- [ ] 加入「複製翻譯結果」的備選功能
- [ ] 支援右鍵選單翻譯

---

## 結論

| 支援程度 | 平台 |
|---------|------|
| ✅ 完全支援 | 標準 input/textarea、簡單網站 |
| ⚠️ 可能支援 | Notion、Slack、社群媒體、Medium |
| ❌ 無法支援 | Google Docs/Sheets、Office Online、VS Code Web |

**核心限制**：Canvas 渲染的編輯器（Google Docs 等）在技術上無法透過瀏覽器擴充功能操作，因為文字不存在於 DOM 中。
