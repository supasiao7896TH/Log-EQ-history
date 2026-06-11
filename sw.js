const CACHE_NAME = 'smart-pa-v1';

const PRE_CACHE = [
    '/log-eq-history/',
    '/log-eq-history/index.html',
    '/log-eq-history/manifest.json',
    '/log-eq-history/icons/icon-192.png',
    '/log-eq-history/icons/icon-512.png',
];

const CDN_ORIGINS = [
    'cdn.tailwindcss.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'images.unsplash.com',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRE_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Gemini API — always network, never cache
    if (url.hostname.includes('generativelanguage.googleapis.com')) return;

    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    const isCDN = CDN_ORIGINS.some(o => url.hostname.includes(o));

    if (isCDN) {
        // Cache-first for CDN assets
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(resp => {
                    if (resp && resp.ok) {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return resp;
                });
            })
        );
        return;
    }

    // Network-first for app files, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then(resp => {
                if (resp && resp.ok) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                }
                return resp;
            })
            .catch(() =>
                caches.match(event.request)
                    .then(cached => cached || caches.match('/log-eq-history/'))
            )
    );
});
