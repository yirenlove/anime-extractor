/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ExtractorAPI {
  startExtraction: (config: any) => void
  fetchSources: () => void
  searchAnime: (sourceName: string, keyword: string) => void
  parseEpisodes: (sourceName: string, subjectUrl: string) => void
  onResult: (cb: (data: any) => void) => () => void
  onError: (cb: (data: any) => void) => () => void
  onStatus: (cb: (data: any) => void) => () => void
  onCaptcha: (cb: (data: any) => void) => () => void
  onSourcesList: (cb: (data: any[]) => void) => () => void
  onSearchResults: (cb: (data: any[]) => void) => () => void
  onEpisodesData: (cb: (data: any) => void) => () => void
}

interface Window {
  __extractor: ExtractorAPI
}