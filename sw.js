// ===========================
//   CONECT TATTOO — sw.js
//   Service Worker básico (cache simples dos arquivos principais)
// ===========================

// Suba esta versão sempre que trocar os arquivos principais do site,
// para forçar o navegador a buscar as versões novas.
const CACHE_NAME = 'conect-tattoo-cache-v1';

// Caminhos relativos (compatível com GitHub Pages, inclusive em subpastas
// de projeto, ex: usuario.github.io/nome-do-repo/).
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL: pré-cacheia os arquivos principais ─────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa caches antigos de versões anteriores ────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first com fallback pra rede ────────────────
self.addEventListener('fetch', (event) => {
  // Só intercepta requisições GET (evita quebrar POSTs de formulários etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Não cacheia respostas inválidas ou de outras origens (ex: fontes externas, CDNs de terceiros)
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline e sem cache: se for navegação de página, tenta devolver o index como fallback
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
