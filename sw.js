const CACHE_NAME = 'oba-acai-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './sw.js',
  './style.css',
  './ic-oba.png',
  './placeholder.png' 
];

// Instalação do Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Evento de instalação. Abrindo cache e adicionando arquivos.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Cache aberto, adicionando arquivos.');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('Service Worker: Falha ao adicionar arquivos ao cache.', error);
      })
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', function(event) {
  // Ignora requisições a URLs de terceiros (como o Firebase)
  if (event.request.url.startsWith('https://www.gstatic.com/')) {
    return;
  }
  if (event.request.url.startsWith('https://viacep.com.br/')) {
    return;
  }
  if (event.request.url.startsWith('https://unitv-box-367cc.firebaseio.com/')) {
    return;
  }
  if (event.request.url.startsWith('https://fonts.googleapis.com/')) {
    return;
  }

  // Estratégia de cache: Cache-First
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Retorna o arquivo do cache se ele existir
        if (response) {
          console.log('Service Worker: Retornando do cache:', event.request.url);
          return response;
        }

        // Se não houver no cache, busca na rede
        console.log('Service Worker: Buscando na rede:', event.request.url);
        return fetch(event.request);
      })
  );
});

// Ativação do Service Worker e remoção de caches antigos
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Evento de ativação. Limpando caches antigos.');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          // Remove caches que não são o atual
          return cacheName.startsWith('oba-acai-cache-') && cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
