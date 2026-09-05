const CACHE_NAME = 'padaria-os-v2';

// App shell local: precisa funcionar 100% ou a instalação falha (correto).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './pwa.js'
];

// Recursos de terceiros: cacheados "best effort" — um CDN fora do ar
// não pode derrubar a instalação inteira do Service Worker.
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Instalação do Service Worker e Cache dos recursos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // App shell: atômico de propósito (se isso falhar, algo está
      // realmente errado e é melhor a instalação falhar mesmo).
      await cache.addAll(APP_SHELL);

      // CDNs: cada um tenta isoladamente; falha de um não derruba os outros.
      const results = await Promise.allSettled(
        CDN_ASSETS.map((url) => cache.add(url))
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn('[SW] Falha ao cachear CDN (será buscado online depois):', CDN_ASSETS[i], r.reason);
        }
      });

      console.log('[SW] App Shell cacheado');
    }).then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Fetch: Stale-While-Revalidate (Atende offline do cache e atualiza via rede)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});