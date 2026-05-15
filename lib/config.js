// 配置解析模块
// 支持两种输入格式：
//   1. 完整 web-selector 格式：{ factoryId, arguments: { searchConfig: { matchVideo: ... } } }
//   2. 简化格式：{ url, matchVideo: { ... } }

function parseConfig(stdinText) {
  const raw = JSON.parse(stdinText);        // 解析原始 JSON
  const args = raw.arguments || raw;         // 兼容 web-selector 包装格式
  const searchConfig = args.searchConfig || {};
  const mv = searchConfig.matchVideo || args.matchVideo || {};

  return {
    // URL 来源：直接 url 字段，或 searchUrl 模板（{keyword} 替换）
    url: args.url || (searchConfig.searchUrl || '').replace('{keyword}', args.keyword || ''),
    matchVideo: {
      enableNestedUrl: mv.enableNestedUrl === true,
      matchNestedUrl: mv.matchNestedUrl ? new RegExp(mv.matchNestedUrl, 'i') : null,   // 预编译正则
      matchVideoUrl: mv.matchVideoUrl ? new RegExp(mv.matchVideoUrl, 'i') : null,
      cookies: mv.cookies || '',
      addHeadersToVideo: mv.addHeadersToVideo || {}
    }
  };
}

module.exports = { parseConfig };
