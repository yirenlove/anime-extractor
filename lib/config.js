function parseConfig(stdinText) {
  const raw = JSON.parse(stdinText);
  const args = raw.arguments || raw;
  const searchConfig = args.searchConfig || {};
  const mv = searchConfig.matchVideo || args.matchVideo || {};

  return {
    url: args.url || (searchConfig.searchUrl || '').replace('{keyword}', args.keyword || ''),
    matchVideo: {
      enableNestedUrl: mv.enableNestedUrl === true,
      matchNestedUrl: mv.matchNestedUrl ? new RegExp(mv.matchNestedUrl, 'i') : null,
      matchVideoUrl: mv.matchVideoUrl ? new RegExp(mv.matchVideoUrl, 'i') : null,
      cookies: mv.cookies || '',
      addHeadersToVideo: mv.addHeadersToVideo || {}
    }
  };
}

module.exports = { parseConfig };
