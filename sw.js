// 观己 Service Worker - v1
var CACHE_NAME = 'guanji-v1';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        '/index.html',
        '/app.html',
        '/app.css',
        '/app-core.js',
        '/app-ui.js'
      ]);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request);
    })
  );
});
