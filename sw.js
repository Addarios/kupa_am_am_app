const CACHE_NAME = 'bobas-v2';
const ASSETS = [
  'index.html',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
];

// Instalacja i cachowanie zasobów
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Serwowanie plików z cache, gdy jesteśmy offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});