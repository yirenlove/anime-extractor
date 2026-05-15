// 配置解析模块
// 支持两种输入格式，自动检测：
//   1. 完整 web-selector：{ factoryId, arguments: { searchConfig: { matchVideo: ... } } }
//      可通过根级 url 或 keyword 指定加载地址：
//      { url: "...", arguments: { ... } }
//      { keyword: "火影忍者", arguments: { ... } }
//   2. 简化格式：{ url, matchVideo: { ... } }

function parseConfig(stdinText) {
  const raw = JSON.parse(stdinText);
  const args = raw.arguments || raw;
  const searchConfig = args.searchConfig || {};
  const mv = searchConfig.matchVideo || args.matchVideo || {};

  // URL 优先级：根级 url > args.url > searchUrl 模板
  const keyword = raw.keyword || args.keyword || '';
  const url = raw.url || args.url || (searchConfig.searchUrl || '').replace('{keyword}', keyword);

  return {
    url,
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
