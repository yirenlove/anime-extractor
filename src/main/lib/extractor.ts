import { BrowserWindow, session } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { matchRequest } from './interceptor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ExtractorCallbacks {
  onResult?: (data: any, startTime: number) => void
  onError?: (msg: string, startTime: number) => void
}

interface ExtractorConfig {
  url: string
  matchVideo: {
    enableNestedUrl: boolean
    matchNestedUrl: RegExp | null
    matchVideoUrl: RegExp | null
    cookies: string
    addHeadersToVideo: Record<string, string>
  }
}

export function createExtractor(config: ExtractorConfig, callbacks: ExtractorCallbacks) {
  const startTime = Date.now()
  let finished = false
  let postLoadTimer: ReturnType<typeof setTimeout> | null = null
  let globalTimer: ReturnType<typeof setTimeout> | null = null
  const { onResult, onError } = callbacks || {}

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  const ses = session.defaultSession

  const cleanup = () => {
    if (postLoadTimer) { clearTimeout(postLoadTimer); postLoadTimer = null }
    if (globalTimer) { clearTimeout(globalTimer); globalTimer = null }
    if (win && !win.isDestroyed()) {
      win.destroy()
    }
  }

  const finish = (data: any) => {
    if (finished) return
    finished = true
    cleanup()
    if (data.url && onResult) onResult(data, startTime)
    else if (data.error && onError) onError(data.error, startTime)
  }

  const resetPostLoadTimer = () => {
    if (postLoadTimer) clearTimeout(postLoadTimer)
    postLoadTimer = setTimeout(() => finish({ error: 'no_match' }), 5000)
  }

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => {
    if (finished) { cb({ cancel: false }); return }

    const result = matchRequest(details.url, config)

    if (result.type === 'video') {
      if (postLoadTimer) clearTimeout(postLoadTimer)

      const headers = { ...config.matchVideo.addHeadersToVideo }
      if (headers.referer === '') {
        headers.Referer = details.referer || config.url
        delete headers.referer
      }
      const videoUrl = decodeURIComponent(result.url)

      ses.cookies.get({ url: details.url }).then(cookies => {
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
        finish({
          url: videoUrl,
          referer: details.referer || config.url,
          cookie: cookieStr || config.matchVideo.cookies,
          headers
        })
      }).catch(() => {
        finish({
          url: videoUrl,
          referer: details.referer || config.url,
          cookie: config.matchVideo.cookies,
          headers
        })
      })
      cb({ cancel: true })
      return
    }

    if (postLoadTimer) resetPostLoadTimer()
    cb({ cancel: false })
  })

  win.webContents.on('did-finish-load', () => {
    if (finished) return
    const currentUrl = win.webContents.getURL()
    const result = matchRequest(currentUrl, config)
    if (result.type === 'nested') {
      win.loadURL(result.url)
      return
    }
    resetPostLoadTimer()
  })

  win.webContents.on('did-fail-load', (_event, _code, desc) => {
    finish({ error: `load_failed: ${desc}` })
  })

  win.loadURL(config.url)

  globalTimer = setTimeout(() => { finish({ error: 'timeout' }) }, 30000)

  return { win, finish, cleanup }
}
