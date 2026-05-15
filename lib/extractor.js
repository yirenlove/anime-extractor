// 核心提取引擎
// 创建隐藏窗口加载目标页面，通过 session.webRequest 拦截所有网络请求，
// 匹配视频 URL 后收集 Cookie/Referer/Headers，通过回调返回结果。

const { BrowserWindow, session } = require('electron');
const path = require('path');
const { matchRequest } = require('./interceptor');

function createExtractor(config, callbacks) {
  const startTime = Date.now();
  let finished = false;
  const { onResult, onError } = callbacks || {};

  const finish = (data) => {
    if (finished) return;
    finished = true;
    if (data.url && onResult) onResult(data, startTime);
    else if (data.error && onError) onError(data.error, startTime);
  };

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

  let postLoadTimer = null;

  const resetPostLoadTimer = () => {
    if (postLoadTimer) clearTimeout(postLoadTimer);
    postLoadTimer = setTimeout(() => finish({ error: 'no_match' }), 5000);
  };

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => {
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
  });

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

  setTimeout(() => { finish({ error: 'timeout' }); }, 30000);

  return { win, finish };
}

module.exports = { createExtractor };
