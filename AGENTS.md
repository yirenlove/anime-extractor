# anime-extractor

视频聚合源解析工具。基于 electron-vite + TypeScript + Vue 3 + Ant Design Vue。

## 运行

```bash
npm run dev     # 开发模式（HMR）
npm run build   # 构建生产版本
npm run preview # 预览构建产物
```

## 架构

```
src/
├── main/
│   ├── index.ts               # 主进程入口
│   └── lib/
│       ├── config.ts          # JSON 解析，正则预编译
│       ├── interceptor.ts     # URL 正则匹配：video / nested / pass
│       ├── extractor.ts       # 隐藏 BrowserWindow + webRequest 拦截
│       ├── output.ts          # JSON 输出格式化
│       ├── source-manager.ts  # 聚合源拉取/缓存/查询
│       ├── searcher.ts        # cheerio + CSS 选择器搜索
│       └── episode-parser.ts  # cheerio + CSS 选择器解析线路/剧集
├── preload/
│   └── index.ts               # contextBridge IPC 白名单
└── renderer/
    ├── index.html             # Vite 入口
    ├── env.d.ts               # 类型声明
    └── src/
        ├── main.ts            # Vue 应用启动
        ├── App.vue            # 根组件（三步向导）
        ├── components/        # Vue 组件
        ├── types/index.ts     # 共享类型
        └── styles/global.css
```

## 核心流程

1. **源管理** — 启动时从 online.json 拉取视频聚合源列表，本地缓存
2. **搜索** — 使用 cheerio + CSS 选择器解析搜索结果页
3. **剧集解析** — 使用 cheerio + CSS 选择器解析线路和剧集列表
4. **视频提取** — 隐藏窗口加载目标页 → `webRequest.onBeforeRequest` 拦截 → 匹配视频 → 收集 cookies → 返回

## IPC 通道

| 通道 | 方向 | 用途 |
|------|------|------|
| `fetch-sources` | R→M | 获取源列表 |
| `search-anime` | R→M | 搜索番剧 |
| `parse-episodes` | R→M | 解析线路/剧集 |
| `start-extraction` | R→M | 提取视频直链 |
| `sources-list` | M→R | 返回源列表 |
| `search-results` | M→R | 返回搜索结果 |
| `episodes-data` | M→R | 返回线路/剧集 |
| `extraction-result` | M→R | 返回提取结果 |
| `extraction-error` | M→R | 返回错误信息 |

## 安全

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`
- CSP 仅对 GUI 窗口的 `file://` 资源生效
- `will-navigate` 拦截非 data: 跳转，`setWindowOpenHandler` 拒绝弹窗

## 依赖

- electron-vite — 构建工具
- Vue 3 — 渲染进程框架
- Ant Design Vue — UI 组件库
- cheerio — 服务端 HTML 解析
