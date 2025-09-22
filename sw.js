self.addEventListener('install', function(e) {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', function(event) {
  // Aqui você pode interceptar e cachear as requisições
});
