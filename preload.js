const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__extractor', {
  onCaptcha: (detected) => ipcRenderer.send('captcha-detected', detected),
  captchaDone: () => ipcRenderer.send('captcha-done'),
  startExtraction: (config) => ipcRenderer.send('start-extraction', config),
  onResult: (cb) => ipcRenderer.on('extraction-result', (_, data) => cb(data)),
  onError: (cb) => ipcRenderer.on('extraction-error', (_, data) => cb(data)),
  onStatus: (cb) => ipcRenderer.on('extraction-status', (_, data) => cb(data))
});
