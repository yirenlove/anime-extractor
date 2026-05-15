# anime-extractor

Electron 视频直链提取工具。双模式：CLI（stdin）或 GUI 窗口。

## 运行

```bash
# CLI 模式 — stdin 传 JSON 配置
cat config.json | npm start

# GUI 模式 — 无 stdin 时自动进入
npm start
```

- `npm start` = `electron main.js`（不是 `node main.js`）
- Electron CLI 模式下可能需要 `--no-sandbox` 标志
- 配置文件 JSON 中的 `$^` 等特殊字符在 PowerShell 管道传输时会被解释，导致解析错误。改用文件读取（`Get-Content -Raw file.json | .\node_modules\.bin\electron.cmd main.js`）或 `node -e "process.stdout.write(...)"` 传递

## 架构

```
main.js                    # 入口：检测 stdin → runCLI / runGUI
├── lib/config.js          # JSON 解析，正则预编译（纯函数）
├── lib/interceptor.js     # URL 正则匹配：video / nested / pass（纯函数）
├── lib/extractor.js       # 隐藏 BrowserWindow + webRequest 拦截（Electron）
├── lib/output.js          # JSON 输出格式化（纯函数）
├── preload.js             # contextBridge IPC 白名单
└── renderer/index.html    # GUI 界面
```

- **配置**：支持两种格式自动检测 — 完整 web-selector（`{ factoryId, arguments: { searchConfig: ... } }`）和简化格式（`{ url, matchVideo: { ... } }`）
- **匹配规则**：正则字符串在 config.js 中预编译为 `RegExp` 对象
  - `matchVideoUrl`：视频 URL 正则，`?<v>` named group 捕获 `url=` 参数中的编码地址
  - `matchNestedUrl`：中间页跳转正则，`enableNestedUrl: true` 时启用
  - `addHeadersToVideo.referer === ""` 触发自动填充 Referer header
- **提取引擎**：隐藏窗口加载目标页 → `webRequest.onBeforeRequest` 拦截 → 匹配视频则 `cb({ cancel: true })` 阻止下载弹窗 → 收集 cookies → 回调返回
- **结束机制**：页面加载后 5s 无请求 → `no_match`；30s 全局超时 → `timeout`
- **IPC**：只有 4 个通道通过 preload 白名单暴露（`start-extraction`、`extraction-result`、`extraction-error`、`extraction-status`）

## 安全

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`
- CSP 仅对 GUI 窗口的 `file://` 资源生效（提取窗口的外部请求不受 CSP 限制）
- `will-navigate` 拦截非 data: 跳转，`setWindowOpenHandler` 拒绝弹窗

## 输出格式

```json
{
  "url": "https://.../video.m3u8",
  "referer": "https://...",
  "cookie": "key=value",
  "headers": { "Referer": "https://..." },
  "duration_ms": 1475
}
```

错误时：`{ "error": "timeout" | "no_match" | "load_failed: ..." }`

## 无测试框架

无 test runner、lint、typecheck。所有验证通过手动运行 CLI 模式完成。
