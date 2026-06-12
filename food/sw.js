const CACHE_NAME = 'vprime-delivery-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://sdk.mercadopago.com/js/v2',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// Instalação do Service Worker e salvamento dos arquivos em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 SW: Salvando arquivos essenciais no cache offline...');
      return cache.addAll(urlsToCache);
    })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 SW: Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Interceptador de requisições (Traz do cache se estiver offline)
self.addEventListener('fetch', event => {
  // Ignora requisições de envio de dados POST para a API do Google
  if (event.request.method === 'POST') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Arquivo encontrado no cache local
      }
      return fetch(event.request).catch(() => {
        // Fallback caso a página principal não carregue de forma alguma
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
