// 源管理模块
// 获取、缓存、查询 online.json 中的视频聚合源

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const SOURCES_URL = 'https://gh-proxy.com/raw.githubusercontent.com/MajoSissi/animeko-source/main/dist/online.json';
const CACHE_PATH = path.join(__dirname, '..', 'sources-cache.json');

let cachedSources = null;

async function fetchSources() {
  try {
    const res = await fetch(SOURCES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data?.exportedMediaSourceDataList?.mediaSources || [];
    cachedSources = list.map(s => ({
      name: s.arguments?.name || 'Unknown',
      description: s.arguments?.description || '',
      iconUrl: s.arguments?.iconUrl || '',
      searchConfig: s.arguments?.searchConfig || {}
    }));
    // 写入缓存
    await fsp.writeFile(CACHE_PATH, JSON.stringify(cachedSources, null, 2), 'utf-8');
    return cachedSources;
  } catch (err) {
    // 回退到缓存
    return loadCache();
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      cachedSources = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      return cachedSources;
    }
  } catch {}
  return [];
}

function getSources() {
  return cachedSources || loadCache();
}

function getSourceByName(name) {
  const sources = getSources();
  return sources.find(s => s.name === name) || null;
}

module.exports = { fetchSources, getSources, getSourceByName };
