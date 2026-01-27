# 中英翻譯助手 Chrome Extension

一個輕量級的 Chrome 擴充功能，讓你在任何網頁的輸入框中選取中文文字後，一鍵翻譯成英文並直接替換。

## 功能特色

- ✨ **即時翻譯** - 選取中文，點擊按鈕即可翻譯
- 🔄 **自動替換** - 翻譯結果直接替換原文
- 🎯 **智能偵測** - 自動識別輸入框中的選取文字
- 🎨 **美觀介面** - 漸層色浮動按鈕，支援深色模式
- 🆓 **完全免費** - 使用非官方 Google 翻譯 API，無需 API Key

## 安裝方式

### 開發者模式安裝

1. 下載或 clone 此專案
2. 開啟 Chrome 瀏覽器，前往 `chrome://extensions`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇此專案資料夾
6. 完成！

## 使用方式

1. 在任何網頁的輸入框（input、textarea、contenteditable）中輸入中文
2. 用滑鼠選取想要翻譯的中文文字
3. 選取完成後，會出現紫色的「英文」浮動按鈕
4. 點擊按鈕
5. 選取的中文會被翻譯並替換成英文

## 檔案結構

```
translate-extension/
├── manifest.json      # 擴充功能設定檔
├── background.js      # 背景腳本 - 處理 API 請求
├── content.js         # 內容腳本 - DOM 操作
├── styles.css         # 浮動按鈕樣式
├── .gitignore         # Git 忽略檔案
├── README.md          # 說明文件
└── icons/             # 擴充功能圖示
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 技術說明

- **Manifest V3** - 使用最新的 Chrome 擴充功能規範
- **Service Worker** - background.js 作為 service worker 執行
- **Google Translate API** - 使用非官方免費端點 `translate.googleapis.com`

## 注意事項

⚠️ 此擴充功能使用非官方 Google 翻譯 API：
- Google 可能隨時更改或封鎖此端點
- 頻繁請求可能被暫時封鎖
- 僅建議用於個人測試使用

## 版本歷史

### v1.0.0 (2026-01-27)
- 初始版本
- 支援 input、textarea、contenteditable 元素
- 中文翻譯成英文功能
- 浮動按鈕 UI

## 授權

MIT License
