const config = {
  url: 'https://www.jibi.cc/index.php/vod/play/id/2226/sid/1/nid/1.html',
  matchVideo: {
    enableNestedUrl: true,
    matchNestedUrl: '$^',
    matchVideoUrl: '(^https?:\\/\\/(?:play\\.xluuss\\.com|hn\\.bfvvs\\.com|play\\.subokk\\.com).+\\.(mp4|m3u8|flv|mkv)(\\?.+)?)|(url=(?<v>https?:\\/\\/(?:play\\.xluuss\\.com|hn\\.bfvvs\\.com|play\\.subokk\\.com).+\\.(mp4|m3u8|flv|mkv)(\\?.+)?))',
    cookies: 'quality=1080',
    addHeadersToVideo: { referer: '' }
  }
};
process.stdout.write(JSON.stringify(config));
