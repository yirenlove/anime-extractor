import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SOURCES_URL = 'https://gh-proxy.com/raw.githubusercontent.com/MajoSissi/animeko-source/main/dist/online.json'
// 缓存路径指向项目根目录（out/main/lib/ → ../../..）
const CACHE_PATH = path.join(__dirname, '..', '..', '..', 'sources-cache.json')
export interface Source {
  name: string
  description: string
  iconUrl: string
  searchConfig: Record<string, any>
}

let cachedSources: Source[] | null = null

export async function fetchSources(): Promise<Source[]> {
  try {
    const res = await fetch(SOURCES_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const list = data?.exportedMediaSourceDataList?.mediaSources || []
    cachedSources = list.map((s: any) => ({
      name: s.arguments?.name || 'Unknown',
      description: s.arguments?.description || '',
      iconUrl: s.arguments?.iconUrl || '',
      searchConfig: s.arguments?.searchConfig || {}
    }))
    await fs.promises.writeFile(CACHE_PATH, JSON.stringify(cachedSources, null, 2), 'utf-8')
    return cachedSources
  } catch {
    return loadCache()
  }
}

function loadCache(): Source[] {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      cachedSources = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
      return cachedSources!
    }
  } catch {}
  return []
}

export function getSources(): Source[] {
  return cachedSources || loadCache()
}

export function getSourceByName(name: string): Source | null {
  const sources = getSources()
  return sources.find(s => s.name === name) || null
}
