// Service Worker - Portal Vendedor Comercial A. Puchol
const CACHE_NAME = 'portal-puchol-v1';

// Archivos a cachear para funcionamiento offline básico
const STATIC_ASSETS = [
  '/portal-vendedor/',
  '/portal-vendedor/index.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Poppins:wght@300;400;500;600;700&display=swap',
];

// Instalar: cachear assets estáticos
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.log('Cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia Network First para la API, Cache First para assets
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API de Railway: siempre red (no cachear datos)
  if (url.hostname.includes('railway.app')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(
          JSON.stringify({ error: 'Sin conexión. Comprueba tu red.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Google Fonts y assets estáticos: Cache First
  if (url.hostname.includes('fonts.') || url.hostname.includes('gstatic.')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  // index.html y resto: Network First con fallback a caché
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('/portal-vendedor/index.html');
        });
      })
  );
});
