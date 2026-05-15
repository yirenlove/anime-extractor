// 输出格式化模块（纯函数）
// 对提取结果和错误信息做 JSON 序列化，附加耗时

function formatOutput(result, startTime) {
  return JSON.stringify({
    url: result.url,
    referer: result.referer || '',
    cookie: result.cookie || '',
    headers: result.headers || {},
    duration_ms: Date.now() - startTime
  }, null, 2);
}

function formatError(message, startTime) {
  return JSON.stringify({
    error: message,
    duration_ms: Date.now() - startTime
  }, null, 2);
}

module.exports = { formatOutput, formatError };
