// 剧集解析模块
// 使用 cheerio + CSS 选择器解析播放页中的线路和剧集列表

const cheerio = require('cheerio');

async function parseEpisodes(source, subjectUrl) {
  const sc = source.searchConfig;
  const cf = sc.selectorChannelFormatFlattened || {};
  const ua = sc.matchVideo?.addHeadersToVideo?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  const res = await fetch(subjectUrl, {
    headers: { 'User-Agent': ua },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Episode page HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const channels = [];
  const channelNames = $(cf.selectChannelNames || []);
  const episodeLists = $(cf.selectEpisodeLists || []);

  let channelNameRegex = null;
  let episodeSortRegex = null;
  try { if (cf.matchChannelName) channelNameRegex = new RegExp(cf.matchChannelName); } catch {}
  try { if (cf.matchEpisodeSortFromName) episodeSortRegex = new RegExp(cf.matchEpisodeSortFromName); } catch {}

  if (channelNames.length > 0) {
    channelNames.each((i, el) => {
      const rawName = $(el).text().trim();
      let channelName = rawName;
      if (channelNameRegex) {
        const m = rawName.match(channelNameRegex);
        if (m?.groups?.ch) channelName = m.groups.ch;
      }

      const listContainer = episodeLists.eq(i);
      const episodes = [];

      if (cf.selectEpisodesFromList) {
        listContainer.find(cf.selectEpisodesFromList).each((_, epEl) => {
          const epName = $(epEl).text().trim();
          let epLink = '';

          if (cf.selectEpisodeLinksFromList) {
            epLink = $(epEl).find(cf.selectEpisodeLinksFromList).attr('href') || '';
          }
          if (!epLink) {
            epLink = $(epEl).attr('href') || '';
          }

          if (!epLink.startsWith('http') && epLink) {
            try {
              const base = new URL(subjectUrl);
              epLink = new URL(epLink, base.origin).href;
            } catch {}
          }

          let sort = 0;
          if (episodeSortRegex && epName) {
            const m = epName.match(episodeSortRegex);
            if (m?.groups?.ep) {
              const parsed = parseFloat(m.groups.ep);
              if (!isNaN(parsed)) sort = parsed;
            }
          }

          if (epName && epLink) {
            episodes.push({ name: epName, url: epLink, sort });
          }
        });
      }

      channels.push({ name: channelName, episodes });
    });
  } else {
    const nc = sc.selectorChannelFormatNoChannel || {};
    const episodes = [];

    if (nc.selectEpisodes) {
      $(nc.selectEpisodes).each((_, el) => {
        const epName = $(el).text().trim();
        let epLink = '';

        if (nc.selectEpisodeLinks) {
          epLink = $(el).find(nc.selectEpisodeLinks).attr('href') || '';
        }
        if (!epLink) {
          epLink = $(el).attr('href') || '';
        }

        if (!epLink.startsWith('http') && epLink) {
          try {
            const base = new URL(subjectUrl);
            epLink = new URL(epLink, base.origin).href;
          } catch {}
        }

        let sort = 0;
        const regex = episodeSortRegex || (nc.matchEpisodeSortFromName ? new RegExp(nc.matchEpisodeSortFromName) : null);
        if (regex && epName) {
          const m = epName.match(regex);
          if (m?.groups?.ep) {
            const parsed = parseFloat(m.groups.ep);
            if (!isNaN(parsed)) sort = parsed;
          }
        }

        if (epName && epLink) {
          episodes.push({ name: epName, url: epLink, sort });
        }
      });
    }

    channels.push({ name: '默认线路', episodes });
  }

  return { channels };
}

module.exports = { parseEpisodes };
