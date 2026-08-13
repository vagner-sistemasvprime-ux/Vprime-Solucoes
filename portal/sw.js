const CACHE_NAME = 'akitamoios-v2';

// Arquivos e bibliotecas estáticas necessárias para o app e a estilização
const ASSETS_TO_CACHE = [
  '/',
  '/akitamoios.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação do Service Worker e pré-carregamento dos arquivos do layout
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos addAll de forma segura para registrar o layout inicial
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Aviso no cache inicial:', err));
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos (v1, etc.)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de requisição: Busca na Rede e salva em cache (Rede -> Cache)
self.addEventListener('fetch', (event) => {
  // Ignora APENAS as chamadas do Google Apps Script para não travar o consumo da planilha
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a busca na rede funcionou, guarda/atualiza a cópia no cache (incluindo estilos)
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se a rede falhar (offline), recorre ao arquivo salvo no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso específico: se for a navegação da página principal offline
          if (event.request.mode === 'navigate') {
            return caches.match('/akitamoios.html');
          }
        });
      })
  );
});
