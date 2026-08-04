/* xu的工作台 Service Worker：离线可用 + 数据缓存 */
const VERSION = 'xu-v1';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.webmanifest',
  './js/store.js',
  './js/tts.js',
  './js/app.js',
  './js/panels/home.js',
  './js/panels/fitness.js',
  './js/panels/creation.js',
  './js/panels/english.js',
  './js/panels/reading.js',
  './js/panels/study.js',
  './js/panels/money.js',
  './js/panels/recipes.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url);
  // 数据文件：网络优先，失败回退缓存
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./data/index.json')))
    );
    return;
  }
  // 应用外壳：缓存优先
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(VERSION).then((c) => c.put(req, clone));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
