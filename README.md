# anime-extractor

Electron CLI tool for extracting anime video direct URLs.

## Usage

```bash
cat config.json | npx electron main.js
# or
Get-Content -Raw config.json | .\node_modules\.bin\electron.cmd main.js
```

## Config Format

Supports both full `web-selector` format and simplified format:

```json
{
  "url": "https://www.example.com/play/123.html",
  "matchVideo": {
    "enableNestedUrl": true,
    "matchNestedUrl": "$^",
    "matchVideoUrl": "(https?://...\\.(mp4|m3u8|flv|mkv)...)",
    "cookies": "quality=1080",
    "addHeadersToVideo": {
      "referer": ""
    }
  }
}
```

## Output

```json
{
  "url": "https://.../video.m3u8",
  "referer": "https://...",
  "cookie": "quality=1080",
  "headers": {
    "Referer": "https://..."
  },
  "duration_ms": 3420
}
```
