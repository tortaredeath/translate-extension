import resolve from '@rollup/plugin-node-resolve';

export default [
  // Content Script
  {
    input: 'src/content/index.js',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      name: 'TranslateHelper'
    },
    plugins: [resolve()]
  },
  // Background Script
  {
    input: 'src/background/index.js',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      name: 'TranslateHelperBG'
    },
    plugins: [resolve()]
  },
  // Popup Script
  {
    input: 'src/popup/index.js',
    output: {
      file: 'dist/popup.js',
      format: 'iife',
      name: 'TranslateHelperPopup'
    },
    plugins: [resolve()]
  }
];
