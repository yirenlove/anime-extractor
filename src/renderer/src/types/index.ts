export interface Source {
  name: string
  description: string
  iconUrl: string
  searchConfig: Record<string, any>
}

export interface SearchResult {
  name: string
  url: string
}

export interface Episode {
  name: string
  url: string
  sort: number
}

export interface Channel {
  name: string
  episodes: Episode[]
}

export interface ExtractionResult {
  url: string
  referer: string
  cookie: string
  headers: Record<string, string>
  duration_ms: number
}

export interface ExtractionError {
  error: string
  duration_ms?: number
}

export type WizardStep = 1 | 2 | 3
