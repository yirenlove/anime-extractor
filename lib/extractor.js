const { BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { matchRequest } = require('./interceptor');

function createExtractor(config, callbacks) {
  const startTime = Date.now();
  let finished = false;
  let captchaTimer = null;
  const { onResult, onError } = callbacks || {};

  const finish = (data) => {
    if (finished) return;
    finished = true;
    if (captchaTimer) clearTimeout(captchaTimer);
    if (data.url && onResult) onResult(data, startTime);
    else if (data.error && onError) onError(data.error, startTime);
  };

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const ses = session.defaultSession;

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => {
    if (finished) { cb({ cancel: false }); return; }

    const result = matchRequest(details.url, config);

    if (result.type === 'video') {
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
      cb({ cancel: false });
      return;
    }

    cb({ cancel: false });
  });

  win.webContents.on('did-finish-load', () => {
    if (finished) return;
    const currentUrl = win.webContents.getURL();
    const result = matchRequest(currentUrl, config);
    if (result.type === 'nested') {
      win.loadURL(result.url);
    }
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    finish({ error: `load_failed: ${errorDescription}` });
  });

  ipcMain.on('captcha-detected', () => { win.show(); });
  ipcMain.on('captcha-done', () => { if (captchaTimer) clearTimeout(captchaTimer); });

  win.loadURL(config.url);

  setTimeout(() => { finish({ error: 'timeout' }); }, 30000);

  return { win, finish };
}

module.exports = { createExtractor };
