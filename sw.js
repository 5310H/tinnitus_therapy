const CACHE_NAME = 'trahreg-tinnitus-suite-v1.2.0';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './storage.js',
    './nav.js',
    './manifest.json',
    './about.html',
    './decorrelated.html',
    './feedback.html',
    './generator.html',
    './hearingtest.html',
    './lenire.html',
    './license.html',
    './meter.html',
    './notch.html',
    './notchfinder.html',
    './recommended.html',
    './research.html',
    './soundtherapy.html',
    './spectrogram.html',
    './sweep.html',
    './twotone.html',
    './validation.html',
    './disclaimer.html',
    './docs/index.html',
    './icon-192.png',
    './icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install: Cache all essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Serve from cache first, fallback to network and dynamic caching
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response and it's from our origin
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            });
        })
    );
});