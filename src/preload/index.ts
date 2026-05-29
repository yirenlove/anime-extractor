import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('__extractor', {
  startExtraction: (config: any) => {
    ipcRenderer.send('start-extraction', config)
  },

  fetchSources: () => {
    ipcRenderer.send('fetch-sources')
  },

  searchAnime: (sourceName: string, keyword: string) => {
    ipcRenderer.send('search-anime', { sourceName, keyword })
  },

  parseEpisodes: (sourceName: string, subjectUrl: string) => {
    ipcRenderer.send('parse-episodes', { sourceName, subjectUrl })
  },

  onResult: (cb: (data: any) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('extraction-result', listener)
    return () => ipcRenderer.removeListener('extraction-result', listener)
  },
  onError: (cb: (data: any) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('extraction-error', listener)
    return () => ipcRenderer.removeListener('extraction-error', listener)
  },
  onStatus: (cb: (data: any) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('extraction-status', listener)
    return () => ipcRenderer.removeListener('extraction-status', listener)
  },
  onCaptcha: (cb: (data: any) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('captcha-detected', listener)
    return () => ipcRenderer.removeListener('captcha-detected', listener)
  },

  onSourcesList: (cb: (data: any[]) => void) => {
    const listener = (_event: any, data: any[]) => cb(data)
    ipcRenderer.on('sources-list', listener)
    return () => ipcRenderer.removeListener('sources-list', listener)
  },
  onSearchResults: (cb: (data: any[]) => void) => {
    const listener = (_event: any, data: any[]) => cb(data)
    ipcRenderer.on('search-results', listener)
    return () => ipcRenderer.removeListener('search-results', listener)
  },
  onEpisodesData: (cb: (data: any) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('episodes-data', listener)
    return () => ipcRenderer.removeListener('episodes-data', listener)
  }
})