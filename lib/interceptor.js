function extractUrlParam(url) {
  const m = url.match(/[?&]url=([^&]+)/i);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { return null; }
  }
  return null;
}

function matchRequest(url, config) {
  const mv = config.matchVideo;
  if (!mv.matchVideoUrl) return { type: 'pass' };

  const tryMatch = (target) => {
    const m = target.match(mv.matchVideoUrl);
    if (m) {
      return m.groups?.v || target;
    }
    return null;
  };

  let videoUrl = tryMatch(url);
  if (!videoUrl) {
    const paramUrl = extractUrlParam(url);
    if (paramUrl) videoUrl = tryMatch(paramUrl);
  }
  if (videoUrl) return { type: 'video', url: videoUrl };

  if (mv.enableNestedUrl && mv.matchNestedUrl) {
    const nm = url.match(mv.matchNestedUrl);
    if (nm) {
      const nestedUrl = nm.groups?.v || nm.groups?.url || url;
      return { type: 'nested', url: nestedUrl };
    }
  }

  return { type: 'pass' };
}

module.exports = { matchRequest };
