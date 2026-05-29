export interface MatchVideoConfig {
  enableNestedUrl: boolean
  matchNestedUrl: RegExp | null
  matchVideoUrl: RegExp | null
  cookies: string
  addHeadersToVideo: Record<string, string>
}

export interface ParsedConfig {
  url: string
  matchVideo: MatchVideoConfig
}

export function parseConfig(stdinText: string): ParsedConfig {
  const raw = JSON.parse(stdinText)
  const args = raw.arguments || raw
  const searchConfig = args.searchConfig || {}
  const mv = searchConfig.matchVideo || args.matchVideo || {}

  const keyword: string = raw.keyword || args.keyword || ''
  const url: string = raw.url || args.url || (searchConfig.searchUrl || '').replace('{keyword}', keyword)

  return {
    url,
    matchVideo: {
      enableNestedUrl: mv.enableNestedUrl === true,
      matchNestedUrl: mv.matchNestedUrl ? new RegExp(mv.matchNestedUrl, 'i') : null,
      matchVideoUrl: mv.matchVideoUrl ? new RegExp(mv.matchVideoUrl, 'i') : null,
      cookies: mv.cookies || '',
      addHeadersToVideo: mv.addHeadersToVideo || {}
    }
  }
}
