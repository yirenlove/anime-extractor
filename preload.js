// Preload 脚本 —— 安全桥接主进程与渲染进程
// 使用 contextBridge 显式暴露 API，不泄露 ipcRenderer 到页面

const { contextBridge, ipcRenderer } = require('electron');

// 白名单：只允许这些通道通信
const SEND_CHANNELS = ['start-extraction', 'fetch-sources', 'search-anime', 'parse-episodes'];
const RECEIVE_CHANNELS = ['extraction-result', 'extraction-error', 'extraction-status', 'sources-list', 'search-results', 'episodes-data'];

contextBridge.exposeInMainWorld('__extractor', {
  // ── 渲染进程 → 主进程（单向） ──
  startExtraction: (config) => {
    ipcRenderer.send('start-extraction', config);
  },

  fetchSources: () => {
    ipcRenderer.send('fetch-sources');
  },

  searchAnime: (sourceName, keyword) => {
    ipcRenderer.send('search-anime', { sourceName, keyword });
  },

  parseEpisodes: (sourceName, subjectUrl) => {
    ipcRenderer.send('parse-episodes', { sourceName, subjectUrl });
  },

  // ── 主进程 → 渲染进程（订阅） ──
  onResult: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('extraction-result', listener);
    return () => ipcRenderer.removeListener('extraction-result', listener);
  },
  onError: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('extraction-error', listener);
    return () => ipcRenderer.removeListener('extraction-error', listener);
  },
  onStatus: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('extraction-status', listener);
    return () => ipcRenderer.removeListener('extraction-status', listener);
  },
  onCaptcha: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('captcha-detected', listener);
    return () => ipcRenderer.removeListener('captcha-detected', listener);
  },

  onSourcesList: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('sources-list', listener);
    return () => ipcRenderer.removeListener('sources-list', listener);
  },
  onSearchResults: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('search-results', listener);
    return () => ipcRenderer.removeListener('search-results', listener);
  },
  onEpisodesData: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('episodes-data', listener);
    return () => ipcRenderer.removeListener('episodes-data', listener);
  }
});