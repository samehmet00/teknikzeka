const CACHE_NAME = 'teknikzeka-v1';

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Kuruldu');
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Sitenin hızlı açılması için basit bir ağ-öncelikli yapı
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});