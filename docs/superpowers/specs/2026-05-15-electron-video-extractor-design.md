# Electron 视频直链提取 CLI 工具 - 设计文档

## 概述

基于 Electron 的命令行工具，通过嵌入式 webview 加载目标动漫网页，拦截网络请求，
利用正则规则匹配视频直链（m3u8/mp4/flv/mkv），处理中间页跳转和验证码，
最终输出视频真实 URL + Referer + Cookie。

## 技术栈

- **运行时**: Electron (主进程 + 隐藏 BrowserWindow)
- **拦截**: `session.webRequest.onBeforeRequest`
- **输入**: stdin JSON 配置
- **输出**: stdout JSON

## 架构

```
stdin (config JSON)
    │
    ▼
main.js ──→ config.js (解析配置)
    │
    ├──→ extractor.js (核心编排)
    │       ├── 创建隐藏 BrowserWindow
    │       ├── 绑定 interceptor.js
    │       ├── loadURL 加载目标页
    │       ├── 检测验证码 → win.show()
    │       └── 视频命中 / 超时 → 输出 → app.quit()
    │
    ├──→ interceptor.js (网络拦截)
    │       ├── onBeforeRequest 拦截所有请求
    │       ├── matchVideoUrl 正则匹配 → 命中视频
    │       ├── matchNestedUrl 正则匹配 → 跟进跳转
    │       └── 放行普通静态资源
    │
    └──→ preload.js (验证码检测桥接)
            └── contextBridge 暴露 captcha 回调
```

## 配置格式

支持两种格式，自动检测：

### 完整 web-selector 格式

```json
{
  "factoryId": "web-selector",
  "arguments": {
    "name": "...",
    "searchConfig": {
      "searchUrl": "...",
      "matchVideo": { ... }
    }
  }
}
```

### 简化格式

```json
{
  "url": "https://www.example.com/play/123.html",
  "matchVideo": {
    "enableNestedUrl": true,
    "matchNestedUrl": "$^",
    "matchVideoUrl": "(https?://...\\.(mp4|m3u8|flv|mkv)...)",
    "cookies": "quality=1080",
    "addHeadersToVideo": { "referer": "" }
  }
}
```

## 核心流程

1. 从 stdin 读取配置 JSON
2. 创建隐藏 BrowserWindow，获取 defaultSession
3. 注册 `session.webRequest.onBeforeRequest` 拦截器
4. 调用 `win.loadURL(url)` 加载目标页
5. 对每个拦截到的请求 URL：
   - 执行 `matchVideoUrl` 正则 → 匹配 → 记录视频 URL + Referer + Cookie + Headers
   - 如果 `enableNestedUrl`，执行 `matchNestedUrl` 正则 → 匹配 → `win.loadURL()` 跟进
   - 都不匹配 → 放行
6. 验证码检测：preload 检测 DOM 特征 → 通知主进程 → `win.show()` 弹出 → 用户处理 → 继续
7. 视频命中（首个）或 30s 超时 → 输出 JSON → `app.quit()`

## 输出格式

```json
{
  "url": "https://example.com/video.m3u8",
  "referer": "https://www.example.com/",
  "cookie": "key=value",
  "headers": {
    "User-Agent": "Mozilla/5.0 ...",
    "Referer": "https://www.example.com/"
  },
  "duration_ms": 3420
}
```

## 文件结构

```
anime-extractor/
├── package.json
├── main.js              # CLI 入口
├── preload.js           # 预加载脚本
└── lib/
    ├── config.js        # 配置解析
    ├── interceptor.js   # 网络拦截 + 正则匹配
    ├── extractor.js     # 核心编排
    └── output.js        # 输出格式化
```

## 错误处理

- **超时** (30s): 输出 `{ error: "timeout", partial_results: [...] }`
- **无匹配**: 输出 `{ error: "no_video_found" }`
- **配置解析失败**: 输出 `{ error: "invalid_config", detail: "..." }` 到 stderr
- **验证码超时** (60s wait): 输出 `{ error: "captcha_timeout" }`

## 注意事项

- CLI 模式下 `app.disableHardwareAcceleration()` 减少资源占用
- 设置 `win.show()` 后用户完成验证，通过 IPC 或 `did-finish-load` 检测继续
- Cookie 自动通过 session 持久化，无需手动管理
- 所有正则规则复用已有的 web-selector 配置格式
