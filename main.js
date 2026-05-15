// ── Electron 主进程入口 ──
//
// 双模式：
//   CLI 模式：stdin 有数据 → 解析配置 → 创建提取器 → stdout 输出 JSON
//   GUI 模式：无 stdin → 打开可视窗口 → 用户输入 URL 点击提取

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseConfig } = require('./lib/config');
const { createExtractor } = require('./lib/extractor');
const { formatOutput, formatError } = require('./lib/output');

// CLI 模式下不需要 GPU 加速，减少资源占用
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  // 判断 stdin 是否有数据 → 决定模式
  try {
    const stdinData = fs.readFileSync(0, 'utf-8');
    if (stdinData.trim()) {
      runCLI(stdinData);
      return;
    }
  } catch {}

  runGUI();
});

// ── 安全策略 ──

// CSP：仅对 GUI 窗口自身（file:// 资源）生效，不拦截提取窗口的外部请求
function applyCSP(win) {
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const url = details.url || '';
    if (!url.startsWith('file://') && !url.startsWith('data:')) {
      callback({ cancel: false });
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        ]
      }
    });
  });
}

// 导航守卫：阻止外部 URL 跳转和新窗口弹出
function applyNavigationGuard(win) {
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'data:' && parsed.protocol !== 'blob:') {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// ── CLI 模式 ──
function runCLI(stdinData) {
  try {
    const config = parseConfig(stdinData);
    if (!config.url) {
      process.stderr.write('{"error":"no_url_provided"}\n');
      app.quit();
      return;
    }
    createExtractor(config, {
      onResult: (data, startTime) => {
        process.stdout.write(formatOutput(data, startTime) + '\n');
        app.quit();
      },
      onError: (msg, startTime) => {
        process.stdout.write(formatError(msg, startTime) + '\n');
        app.quit();
      }
    });
  } catch (err) {
    process.stderr.write(JSON.stringify({ error: 'invalid_config', detail: err.message }) + '\n');
    app.quit();
  }
}

// ── GUI 模式 ──
function runGUI() {
  const win = new BrowserWindow({
    width: 720,
    height: 640,
    title: 'Anime Extractor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,     // 隔离 preload / 渲染进程上下文
      nodeIntegration: false,     // 禁止渲染进程直接访问 Node.js
      sandbox: true               // OS 沙箱
    }
  });

  applyCSP(win);
  applyNavigationGuard(win);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 接收渲染进程发起的提取请求
  ipcMain.on('start-extraction', (event, config) => {
    try {
      const parsed = parseConfig(JSON.stringify(config));
      if (!parsed.url) {
        event.sender.send('extraction-error', { error: 'no_url' });
        return;
      }
      const wc = event.sender;

      createExtractor(parsed, {
        onResult: (data, startTime) => {
          // 结果通过 IPC 送回渲染进程
          wc.send('extraction-result', { ...data, duration_ms: Date.now() - startTime });
        },
        onError: (msg, startTime) => {
          wc.send('extraction-error', { error: msg, duration_ms: Date.now() - startTime });
        }
      });
    } catch (err) {
      event.sender.send('extraction-error', { error: err.message });
    }
  });
}
