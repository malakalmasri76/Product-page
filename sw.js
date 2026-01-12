const CACHE_NAME = 'sales-catalog-v1';
const ASSETS = [
  './index.html',
  'https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css'
];

// Install Service Worker and Cache Assets
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// Fetch Assets from Cache if Offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});