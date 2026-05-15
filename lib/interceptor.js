// URL 匹配模块（纯函数，无 Electron 依赖）
// 职责：对请求 URL 执行正则匹配，判断类型：video（视频命中）/ nested（需要跟进）/ pass（放行）

// 从 URL 的 url= 查询参数中提取真实地址（支持 URL-encoded）
function extractUrlParam(url) {
  const m = url.match(/[?&]url=([^&]+)/i);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { return null; }
  }
  return null;
}

// 匹配一个请求 URL
// config.matchVideo.matchVideoUrl 有两条分支（用 | 分隔）：
//   分支1：直链匹配（如 play.xluuss.com/xxx.m3u8）
//   分支2：url= 参数提取，named group <v> 捕获真实地址
//
// 返回 { type: 'video'|'nested'|'pass', url: string }
function matchRequest(url, config) {
  const mv = config.matchVideo;
  if (!mv.matchVideoUrl) return { type: 'pass' };

  // 内层匹配函数，对目标字符串执行正则，提取视频 URL
  const tryMatch = (target) => {
    const m = target.match(mv.matchVideoUrl);
    if (m) {
      return m.groups?.v || target;   // 优先取 named group <v>，否则取整个匹配
    }
    return null;
  };

  // 第一轮：匹配原始 URL
  let videoUrl = tryMatch(url);
  if (!videoUrl) {
    // 第二轮：从 url= 参数中提取并 decode，再匹配
    const paramUrl = extractUrlParam(url);
    if (paramUrl) videoUrl = tryMatch(paramUrl);
  }
  if (videoUrl) return { type: 'video', url: videoUrl };

  // 检查是否需要跟进中间页（嵌套 URL）
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
