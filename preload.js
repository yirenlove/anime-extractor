// Preload 脚本 —— 安全桥接主进程与渲染进程
// 使用 contextBridge 显式暴露 API，不泄露 ipcRenderer 到页面

const { contextBridge, ipcRenderer } = require('electron');

// 白名单：只允许这些通道通信
const SEND_CHANNELS = ['start-extraction'];
const RECEIVE_CHANNELS = ['extraction-result', 'extraction-error', 'extraction-status'];

contextBridge.exposeInMainWorld('__extractor', {
  // ── 渲染进程 → 主进程（单向） ──
  // 发送提取请求，config 包含 { url, matchVideo }
  startExtraction: (config) => {
    ipcRenderer.send('start-extraction', config);
  },

  // ── 主进程 → 渲染进程（订阅） ──
  // 结果回调，返回 cleanup 函数用于取消订阅
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
  }
});
