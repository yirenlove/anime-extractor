# anime-extractor

视频聚合源解析工具 — 从多个动漫资源站搜索、选择剧集、提取视频直链。

## 功能

- 集成 30+ 动漫资源站（animeko-source）
- 三步向导：选源 → 搜番 → 选集 → 提取
- 支持多线路切换
- 视频直链提取（m3u8/mp4/flv）

## 运行

```bash
npm install
npm run dev     # 开发模式
npm run build   # 构建
npm run preview # 预览构建产物
```

## 技术栈

- Electron + electron-vite
- TypeScript
- Vue 3 + Ant Design Vue
- cheerio（服务端 HTML 解析）

## 项目结构

```
src/
├── main/          # 主进程（TypeScript）
├── preload/       # 预加载脚本
└── renderer/      # 渲染进程（Vue 3）
```

## 许可

MIT
