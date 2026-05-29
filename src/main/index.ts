import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseConfig } from './lib/config.js'
import { createExtractor } from './lib/extractor.js'
import { fetchSources, getSourceByName, getSources } from './lib/source-manager.js'
import { search } from './lib/searcher.js'
import { parseEpisodes } from './lib/episode-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.disableHardwareAcceleration()

app.on('window-all-closed', () => {
  app.quit()
})

app.whenReady().then(async () => {
  await fetchSources().catch((err: Error) => console.warn('Source fetch failed:', err.message))
  runGUI()
})

function applyCSP(win: BrowserWindow) {
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const url = details.url || ''
    if (!url.startsWith('file://') && !url.startsWith('data:')) {
      callback({ cancel: false })
      return
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        ]
      }
    })
  })
}

function applyNavigationGuard(win: BrowserWindow) {
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'data:' && parsed.protocol !== 'blob:') {
        event.preventDefault()
      }
    } catch {
      event.preventDefault()
    }
  })

  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
}

function removeAllIPCListeners() {
  ipcMain.removeAllListeners('fetch-sources')
  ipcMain.removeAllListeners('search-anime')
  ipcMain.removeAllListeners('parse-episodes')
  ipcMain.removeAllListeners('start-extraction')
}

ipcMain.on('fetch-sources', async (event) => {
  // 确保异步 fetchSources 完成后再返回
  await fetchSources().catch(() => {})
  event.sender.send('sources-list', getSources())
})

ipcMain.on('search-anime', async (event, data) => {
  const { sourceName, keyword } = data || {}
  if (!sourceName || !keyword) { event.sender.send('search-results', []); return }
  try {
    const source = getSourceByName(sourceName)
    if (!source) {
      event.sender.send('search-results', [])
      return
    }
    const results = await search(source, keyword)
    event.sender.send('search-results', results)
  } catch {
    event.sender.send('search-results', [])
  }
})

ipcMain.on('parse-episodes', async (event, data) => {
  const { sourceName, subjectUrl } = data || {}
  if (!sourceName || !subjectUrl) { event.sender.send('episodes-data', { channels: [] }); return }
  try {
    const source = getSourceByName(sourceName)
    if (!source) {
      event.sender.send('episodes-data', { channels: [] })
      return
    }
    const result = await parseEpisodes(source, subjectUrl)
    event.sender.send('episodes-data', result)
  } catch {
    event.sender.send('episodes-data', { channels: [] })
  }
})

function runGUI() {
  const win = new BrowserWindow({
    width: 720,
    height: 640,
    title: 'Anime Extractor',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  applyCSP(win)
  applyNavigationGuard(win)

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }

  const extractionHandler = (event: any, config: any) => {
    try {
      const parsed = parseConfig(JSON.stringify(config))
      if (!parsed.url) {
        event.sender.send('extraction-error', { error: 'no_url' })
        return
      }
      const wc = event.sender

      createExtractor(parsed, {
        onResult: (data: any, startTime: number) => {
          wc.send('extraction-result', { ...data, duration_ms: Date.now() - startTime })
        },
        onError: (msg: string, startTime: number) => {
          wc.send('extraction-error', { error: msg, duration_ms: Date.now() - startTime })
        }
      })
    } catch (err: any) {
      event.sender.send('extraction-error', { error: err.message })
    }
  }

  ipcMain.on('start-extraction', extractionHandler)

  win.on('closed', () => {
    removeAllIPCListeners()
  })
}
