const CACHE_NAME = 'trahreg-tinnitus-suite-v2.2.4';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './maintenance.html',
    './maintenance.json',
    './storage.js',
    './nav.js',
    './manifest.json',
    './about.html',
    './decorrelated.html',
    './feedback.html',
    './cr.html',
    './binaural.html',
    './cbt.html',
    './generator.html',
    './hearingtest.html',
    './lenire.html',
    './license.html',
    './hardware.html',
    './meter.html',
    './notch.html',
    './noise-processor.js',
    './notchfinder.html',
    './recommended.html',
    './research.html',
    './soundtherapy.html',
    './spectrogram.html',
    './stats.html',
    './sweep.html',
    './twotone.html',
    './lg.html',
    './tmc.html',
    './ri.html',
    './validation.html',
    './disclaimer.html',
    './presentation.html',
    './handout.html',
    './docs/index.html',
    './tinnitus_generator.py',
    './audio/rain.mp3',
    './audio/ocean.mp3',
    './audio/stream.mp3',
    './audio/wind.mp3',
    './icon-192.png',
    './icon-512.png',
    './hardware/haptic_mount.glb', // Updated to professional GLB format
    'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js', // Model Viewer for 3D hardware preview
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', // For clinical report PDF generation
    'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.10.0/dist/index.min.js' // Google Generative AI SDK (for direct client-side calls)
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
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isStaticAsset = url.pathname.endsWith('.css') || url.pathname.endsWith('.js');
    const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '';

    // Bypass cache for maintenance config to allow immediate remote toggling
    if (url.pathname.endsWith('maintenance.json')) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
        return;
    }

    if (isHTML) {
        // Network-first strategy for HTML to ensure version updates are detected immediately
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                const isValidResponse = networkResponse && networkResponse.status === 200;
                if (isValidResponse) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback to cache if network fails (offline mode)
                return caches.match(event.request);
            })
        );
    } else if (isStaticAsset) {
        // Stale-while-revalidate strategy for CSS and JS assets
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        const isValidResponse = networkResponse && networkResponse.status === 200;
                        const isWhiteListedType = networkResponse.type === 'basic' || networkResponse.type === 'cors';

                        if (isValidResponse && isWhiteListedType) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } else {
        // Cache-first strategy for HTML, icons, and audio
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(event.request).then((networkResponse) => {
                    const isValidResponse = networkResponse && networkResponse.status === 200;
                    const isWhiteListedType = networkResponse.type === 'basic' || networkResponse.type === 'cors';

                    if (!isValidResponse || !isWhiteListedType) {
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
    }
});