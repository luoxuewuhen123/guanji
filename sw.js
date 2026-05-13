// 观己 Service Worker - v2
var CACHE_NAME = 'guanji-v2';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        '/index.html',
        '/app.html',
        '/app.css',
        '/app-core.min.js',
        '/app-ui.min.js'
      ]);
    })
  );
});

self.addEventListener('fetch', function(e) {
  // 只拦截同源请求，放过外部CDN
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(function(r) {
        return r || fetch(e.request);
      })
    );
  }
});
