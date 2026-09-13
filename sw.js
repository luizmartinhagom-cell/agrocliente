// AgroClientes Service Worker v9
// Permite uso 100% offline após primeira visita

const CACHE = 'agroclientes-v9';

// Arquivos para cachear
const ARQUIVOS = [
  './',
  './index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalação: cacheia tudo
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ARQUIVOS).catch(() => cache.add('./index.html')))
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Dados que mudam a toda hora (clima, cotação do dólar): nunca usar cache,
// sempre buscar da rede — só cai pro cache se estiver realmente offline.
// (sem isso, o app mostrava temperatura/cotação antigas, guardadas de uma visita anterior)
const SEMPRE_REDE = ['open-meteo.com', 'awesomeapi.com.br'];

// Requisições: cache primeiro, rede como fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (SEMPRE_REDE.some(host => event.request.url.indexOf(host) !== -1)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        const network = fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE).then(c => c.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
  );
});
