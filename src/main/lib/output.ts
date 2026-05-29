export function formatOutput(result: { url: string; referer?: string; cookie?: string; headers?: Record<string, string> }, startTime: number): string {
  return JSON.stringify({
    url: result.url,
    referer: result.referer || '',
    cookie: result.cookie || '',
    headers: result.headers || {},
    duration_ms: Date.now() - startTime
  }, null, 2)
}

export function formatError(message: string, startTime: number): string {
  return JSON.stringify({
    error: message,
    duration_ms: Date.now() - startTime
  }, null, 2)
}
