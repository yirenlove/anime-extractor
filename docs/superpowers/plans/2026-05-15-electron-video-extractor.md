# Electron 视频直链提取 CLI 工具 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 Electron CLI 工具，通过隐藏 BrowserWindow 加载动漫页面，拦截网络请求，正则匹配视频直链（m3u8/mp4/flv/mkv），处理中间页跳转和验证码弹窗，最终输出视频 URL + Referer + Cookie。

**Architecture:** 主进程 `main.js` 从 stdin 读取 JSON 配置，创建隐藏 `BrowserWindow`，通过 `session.webRequest.onBeforeRequest` 拦截所有请求，纯函数模块 `config.js`/`interceptor.js`/`output.js` 负责解析/匹配/格式化，`extractor.js` 负责窗口与 session 生命周期。验证码场景通过 `preload.js` 桥接 + `win.show()` 弹出窗口。

**Tech Stack:** Electron (无其他依赖)

---

### 项目结构

```
anime-extractor/
├── package.json
├── main.js              # CLI 入口：stdin → parse → 创建窗口 → 拦截 → 输出
├── preload.js           # 验证码检测桥接
└── lib/
    ├── config.js        # 配置解析（纯函数）
    ├── interceptor.js   # URL 正则匹配（纯函数）
    ├── extractor.js     # 核心编排：窗口创建、session/webRequest 绑定、验证码
    └── output.js        # 输出格式化（纯函数）
```

---

### Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "anime-extractor",
  "version": "0.1.0",
  "description": "Electron CLI tool for extracting anime video direct URLs",
  "main": "main.js",
  "bin": {
    "anime-extractor": "main.js"
  },
  "scripts": {
    "start": "node main.js"
  },
  "dependencies": {
    "electron": "^33.0.0"
  }
}
```

- [ ] **Step 2: 创建 `.gitignore`**

```
node_modules/
```

- [ ] **Step 3: 初始化项目**

Run:
```bash
npm install
```
Expected: `node_modules/` 和 `package-lock.json` 生成

- [ ] **Step 4: 创建 `lib/` 目录**

```bash
mkdir lib
```

---

### Task 2: `lib/config.js` — 配置解析

**Files:**
- Create: `lib/config.js`

- [ ] **Step 1: 编写 `config.js`**

```js
function parseConfig(stdinText) {
  const raw = JSON.parse(stdinText);
  const args = raw.arguments || raw;
  const searchConfig = args.searchConfig || {};
  const mv = searchConfig.matchVideo || args.matchVideo || {};

  return {
    url: args.url || (searchConfig.searchUrl || '').replace('{keyword}', args.keyword || ''),
    matchVideo: {
      enableNestedUrl: mv.enableNestedUrl === true,
      matchNestedUrl: mv.matchNestedUrl ? new RegExp(mv.matchNestedUrl, 'i') : null,
      matchVideoUrl: mv.matchVideoUrl ? new RegExp(mv.matchVideoUrl, 'i') : null,
      cookies: mv.cookies || '',
      addHeadersToVideo: mv.addHeadersToVideo || {}
    }
  };
}

module.exports = { parseConfig };
```

- [ ] **Step 2: 验证函数**

Run:
```bash
node -e "
const { parseConfig } = require('./lib/config');
const c = parseConfig(JSON.stringify({ url: 'https://example.com', matchVideo: { matchVideoUrl: 'test', enableNestedUrl: true } }));
console.log(c.url === 'https://example.com');
console.log(c.matchVideo.enableNestedUrl === true);
console.log(c.matchVideo.matchVideoUrl instanceof RegExp);
"
```
Expected: `true` three times

---

### Task 3: `lib/interceptor.js` — URL 正则匹配

**Files:**
- Create: `lib/interceptor.js`

- [ ] **Step 1: 编写 `interceptor.js`**

```js
function matchRequest(url, config) {
  const mv = config.matchVideo;
  if (!mv.matchVideoUrl) return { type: 'pass' };

  const m = url.match(mv.matchVideoUrl);
  if (m) {
    const videoUrl = m.groups?.v || url;
    return { type: 'video', url: videoUrl };
  }

  if (mv.enableNestedUrl && mv.matchNestedUrl) {
    const nm = url.match(mv.matchNestedUrl);
    if (nm) {
      const nestedUrl = nm.groups?.v || nm.groups?.url || url;
      return { type: 'nested', url: nestedUrl };
    }
  }

  return { type: 'pass' };
}

module.exports = { matchRequest };
```

- [ ] **Step 2: 验证视频匹配**

Run:
```bash
node -e "
const { matchRequest } = require('./lib/interceptor');
const config = { matchVideo: { matchVideoUrl: /https?:\\\/\\\/play\\.xluuss\\.com.*\\.(mp4|m3u8)/i } };
const r1 = matchRequest('https://play.xluuss.com/20240530/test.m3u8', config);
console.log(r1.type === 'video', r1.url);
const r2 = matchRequest('https://www.jibi.cc/index.html', config);
console.log(r2.type === 'pass');
"
```
Expected: `true https://play.xluuss.com/20240530/test.m3u8` and `true`

- [ ] **Step 3: 验证 url= 编码格式**

```bash
node -e "
const { matchRequest } = require('./lib/interceptor');
const config = { matchVideo: { matchVideoUrl: /url=(?<v>https?:\\\/\\\/[^&]+\.(m3u8|mp4))/i } };
const r = matchRequest('https://play.site.com?url=https%3A%2F%2Fcdn.example.com/video.m3u8', config);
console.log(r.type === 'video', r.url);
"
```
Expected: `true https://cdn.example.com/video.m3u8` (the URL decoding happens in extractor)

- [ ] **Step 4: 验证嵌套 URL 匹配**

```bash
node -e "
const { matchRequest } = require('./lib/interceptor');
const config = { matchVideo: { enableNestedUrl: true, matchNestedUrl: /^https?:\\\/\\\/mid\\.site\\.com\\//i } };
const r = matchRequest('https://mid.site.com/redirect?a=1', config);
console.log(r.type === 'nested', r.url);
"
```
Expected: `true https://mid.site.com/redirect?a=1`

---

### Task 4: `lib/output.js` — 输出格式化

**Files:**
- Create: `lib/output.js`

- [ ] **Step 1: 编写 `output.js`**

```js
function formatOutput(result, startTime) {
  return JSON.stringify({
    url: result.url,
    referer: result.referer || '',
    cookie: result.cookie || '',
    headers: result.headers || {},
    duration_ms: Date.now() - startTime
  }, null, 2);
}

function formatError(message, startTime) {
  return JSON.stringify({
    error: message,
    duration_ms: Date.now() - startTime
  }, null, 2);
}

module.exports = { formatOutput, formatError };
```

- [ ] **Step 2: 验证输出**

```bash
node -e "
const { formatOutput, formatError } = require('./lib/output');
const t = Date.now();
const o = formatOutput({ url: 'https://example.com/v.m3u8', referer: 'https://ref.com', cookie: 'a=1' }, t);
console.log(o);
const e = formatError('timeout', t);
console.log(e);
"
```
Expected: 两个 JSON 对象，包含正确的字段和时间戳

---

### Task 5: `preload.js` — 验证码检测桥接

**Files:**
- Create: `preload.js`

- [ ] **Step 1: 编写 `preload.js`**

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__extractor', {
  onCaptcha: (detected) => {
    ipcRenderer.send('captcha-detected', detected);
  },
  captchaDone: () => {
    ipcRenderer.send('captcha-done');
  }
});
```

---

### Task 6: `lib/extractor.js` — 核心编排

**Files:**
- Create: `lib/extractor.js`

- [ ] **Step 1: 编写 `extractor.js`**

```js
const { BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { matchRequest } = require('./interceptor');
const { formatOutput, formatError } = require('./output');

function createExtractor(config) {
  const startTime = Date.now();
  const results = [];
  let finished = false;
  let captchaTimer = null;

  const finish = (data) => {
    if (finished) return;
    finished = true;
    if (captchaTimer) clearTimeout(captchaTimer);
    const out = data.url ? formatOutput(data, startTime) : formatError(data.error, startTime);
    process.stdout.write(out + '\n');
    process.exit(0);
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

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (finished) return callback({ cancel: false });

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
      });
      return callback({ cancel: false });
    }

    if (result.type === 'nested') {
      callback({ cancel: false });
      return;
    }

    callback({ cancel: false });
  });

  win.webContents.on('did-finish-load', () => {
    if (finished) return;
    const currentUrl = win.webContents.getURL();
    const result = matchRequest(currentUrl, config);
    if (result.type === 'nested') {
      win.loadURL(result.url);
    }
  });

  ipcMain.on('captcha-detected', () => {
    win.show();
  });

  ipcMain.on('captcha-done', () => {
    if (captchaTimer) clearTimeout(captchaTimer);
  });

  win.loadURL(config.url);

  setTimeout(() => {
    finish({ error: 'timeout' });
  }, 30000);

  return { win, finish };
}

module.exports = { createExtractor };
```

---

### Task 7: `main.js` — CLI 入口

**Files:**
- Create: `main.js`

- [ ] **Step 1: 编写 `main.js`**

```js
const { app } = require('electron');
const { parseConfig } = require('./lib/config');
const { createExtractor } = require('./lib/extractor');

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  let stdinData = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => { stdinData += chunk; });
  process.stdin.on('end', () => {
    try {
      const config = parseConfig(stdinData);
      if (!config.url) {
        process.stderr.write('{"error":"no_url_provided"}\n');
        app.quit();
        return;
      }
      createExtractor(config);
    } catch (err) {
      process.stderr.write(JSON.stringify({ error: 'invalid_config', detail: err.message }) + '\n');
      app.quit();
    }
  });
});
```

---

### Task 8: 端到端手动验证

- [ ] **Step 1: 创建测试配置文件 `test-config.json`**

```json
{
  "url": "https://www.jibi.cc/index.php/vod/detail/id/123.html",
  "matchVideo": {
    "enableNestedUrl": true,
    "matchNestedUrl": "$^",
    "matchVideoUrl": "(https?://(?:play\\.xluuss\\.com|hn\\.bfvvs\\.com|play\\.subokk\\.com).+\\.(mp4|m3u8|flv|mkv)(\\?.+)?)|(url=(?<v>https?://(?:play\\.xluuss\\.com|hn\\.bfvvs\\.com|play\\.subokk\\.com).+\\.(mp4|m3u8|flv|mkv)(\\?.+)?))",
    "cookies": "quality=1080",
    "addHeadersToVideo": {
      "referer": ""
    }
  }
}
```

- [ ] **Step 2: 运行工具**

```bash
Get-Content test-config.json | npx electron main.js
```

Expected: stdout 输出包含 `url`、`referer`、`cookie`、`headers` 的 JSON

- [ ] **Step 3: 验证超时场景**

```bash
echo '{ "url": "https://example.com", "matchVideo": { "matchVideoUrl": "nonexistent" } }' | npx electron main.js
```
Expected: 30 秒后输出 `{"error": "timeout", "duration_ms": 30000}`

---

### Task 9: 收尾 — 清理与文档

**Files:**
- Modify: `.gitignore` (添加更多忽略规则)

- [ ] **Step 1: 更新 `.gitignore`**

```
node_modules/
.DS_Store
Thumbs.db
test-config.json
```

- [ ] **Step 2: 添加 `README.md` 使用说明**

```markdown
# anime-extractor

Electron CLI tool for extracting anime video direct URLs.

## Usage

```bash
cat config.json | npx electron main.js
```

## Config Format

See `docs/superpowers/specs/2026-05-15-electron-video-extractor-design.md` for details.

## Output

```json
{
  "url": "https://.../video.m3u8",
  "referer": "https://...",
  "cookie": "quality=1080",
  "headers": { "User-Agent": "...", "Referer": "..." },
  "duration_ms": 3420
}
```
```

---

## Self-Review Checklist

- [x] **Spec coverage**: 所有 spec 中的需求都有对应 task（config 解析、interceptor、extractor、captcha、output）
- [x] **Placeholder scan**: 无 TBD/TODO/占位符，所有代码步骤都有完整实现
- [x] **Type consistency**: module.exports / require 路径在 task 间一致
