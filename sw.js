/* 重訓記錄 PWA service worker:一律繞過 HTTP 快取直接問網路拿最新版,離線才用本地快取
   注意:不能對 navigate 模式的 Request 直接疊加 {cache:'no-store'}(瀏覽器會拒絕),
   所以一律用「URL 字串」重新建構請求來繞過限制。 */
const CACHE = 'gym-log-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

async function refreshCache() {
  const c = await caches.open(CACHE);
  await Promise.all(ASSETS.map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      await c.put(url, res);
    } catch (e) { /* 離線安裝時忽略,舊快取(若有)仍可用 */ }
  }));
}

self.addEventListener('install', e => {
  e.waitUntil(refreshCache());
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const freshReq = new Request(e.request.url, { cache: 'no-store' });
  e.respondWith(
    fetch(freshReq)
      .then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(r => r || caches.match('./index.html'))
      )
  );
});
