// 搜索模块
// 使用 cheerio + CSS 选择器解析搜索结果页

const cheerio = require('cheerio');

async function search(source, keyword) {
  const sc = source.searchConfig;
  if (!sc.searchUrl) throw new Error('searchConfig.searchUrl missing');

  const url = sc.searchUrl.replace('{keyword}', encodeURIComponent(keyword));
  const ua = sc.matchVideo?.addHeadersToVideo?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  const res = await fetch(url, {
    headers: { 'User-Agent': ua },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];
  const formatId = sc.subjectFormatId || 'a';

  if (formatId === 'indexed') {
    const sel = sc.selectorSubjectFormatIndexed || {};
    const names = $(sel.selectNames || 'a');
    const links = $(sel.selectLinks || 'a');

    names.each((i, el) => {
      const name = $(el).text().trim();
      let link = '';

      if (sel.selectLinks === sel.selectNames) {
        link = $(el).attr('href') || '';
      } else {
        link = $(links[i]).attr('href') || '';
      }

      if (name && link) {
        if (!link.startsWith('http')) {
          try {
            const base = new URL(url);
            link = new URL(link, base.origin).href;
          } catch {}
        }
        results.push({ name, url: link });
      }
    });
  } else {
    const sel = sc.selectorSubjectFormatA || {};
    const lists = $(sel.selectLists || 'a');

    lists.each((_, el) => {
      const name = $(el).text().trim();
      let link = $(el).attr('href') || '';
      if (name && link) {
        if (!link.startsWith('http')) {
          try {
            const base = new URL(url);
            link = new URL(link, base.origin).href;
          } catch {}
        }
        results.push({ name, url: link });
      }
    });
  }

  return results;
}

module.exports = { search };
