// 核心提取引擎
// 创建隐藏窗口加载目标页面，通过 session.webRequest 拦截所有网络请求，
// 匹配视频 URL 后收集 Cookie/Referer/Headers，通过回调返回结果。

const { BrowserWindow, session } = require('electron');
const path = require('path');
const { matchRequest } = require('./interceptor');

function createExtractor(config, callbacks) {
  const startTime = Date.now();
  let finished = false;
  let postLoadTimer = null;
  let globalTimer = null;
  let requestListener = null;
  const { onResult, onError } = callbacks || {};

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const ses = session.defaultSession;

  // 清理所有资源
  const cleanup = () => {
    if (postLoadTimer) { clearTimeout(postLoadTimer); postLoadTimer = null; }
    if (globalTimer) { clearTimeout(globalTimer); globalTimer = null; }
    // 移除 webRequest 监听器，避免跨次提取累积
    if (requestListener) {
      ses.webRequest.onBeforeRequest(null, () => {});
      requestListener = null;
    }
    // 销毁隐藏窗口，释放内存
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  };

  const finish = (data) => {
    if (finished) return;
    finished = true;
    cleanup();
    if (data.url && onResult) onResult(data, startTime);
    else if (data.error && onError) onError(data.error, startTime);
  };

  const resetPostLoadTimer = () => {
    if (postLoadTimer) clearTimeout(postLoadTimer);
    postLoadTimer = setTimeout(() => finish({ error: 'no_match' }), 5000);
  };

  // 注册 webRequest 监听器
  requestListener = (details, cb) => {
    if (finished) { cb({ cancel: false }); return; }

    const result = matchRequest(details.url, config);

    if (result.type === 'video') {
      if (postLoadTimer) clearTimeout(postLoadTimer);

      const headers = { ...config.matchVideo.addHeadersToVideo };
      if (headers.referer === '') {
        headers.Referer = details.referer || config.url;
        delete headers.referer;
      }
      const videoUrl = decodeURIComponent(result.url);

      ses.cookies.get({ url: details.url }).then(cookies => {
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        finish({
          url: videoUrl,
          referer: details.referer || config.url,
          cookie: cookieStr || config.matchVideo.cookies,
          headers
        });
      }).catch(() => {
        finish({
          url: videoUrl,
          referer: details.referer || config.url,
          cookie: config.matchVideo.cookies,
          headers
        });
      });
      cb({ cancel: true });
      return;
    }

    if (postLoadTimer) resetPostLoadTimer();
    cb({ cancel: false });
  };

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, requestListener);

  win.webContents.on('did-finish-load', () => {
    if (finished) return;
    const currentUrl = win.webContents.getURL();
    const result = matchRequest(currentUrl, config);
    if (result.type === 'nested') {
      win.loadURL(result.url);
      return;
    }
    resetPostLoadTimer();
  });

  win.webContents.on('did-fail-load', (_event, _code, desc) => {
    finish({ error: `load_failed: ${desc}` });
  });

  win.loadURL(config.url);

  globalTimer = setTimeout(() => { finish({ error: 'timeout' }); }, 30000);

  return { win, finish, cleanup };
}

module.exports = { createExtractor };
