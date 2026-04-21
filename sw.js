const CACHE_NAME = 'trahreg-tinnitus-suite-v1.1.0';
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
    './spectrogram.html',
    './sweep.html',
    './twotone.html',
    './validation.html',
    './disclaimer.html',
    './docs/index.html'
];

// Install: Cache all essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Fetch: Serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});