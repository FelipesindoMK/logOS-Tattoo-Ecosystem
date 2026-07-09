// ===========================
//   LogOS 1.0 — sw.js
//   Service Worker (estratégia "rede primeiro, cache como plano B")
// ===========================
//
// IMPORTANTE: antes, esse Service Worker usava "cache primeiro" pra tudo —
// isso fazia o navegador de quem já tinha visitado o site continuar vendo
// uma versão antiga guardada, mesmo depois de você subir arquivos novos pro
// GitHub, porque o Service Worker só se atualiza sozinho quando este
// arquivo (sw.js) muda de conteúdo. Agora a estratégia é a oposta: sempre
// tenta buscar a versão mais nova primeiro, e só usa a cópia salva (cache)
// se a pessoa estiver sem internet.
//
// Suba esta versão sempre que quiser forçar uma limpeza total do cache
// antigo nos navegadores das pessoas (não é obrigatório a cada mudança,
// mas ajuda em casos teimosos).
const CACHE_NAME = 'logos-cache-v2';

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

// ── INSTALL: pré-cacheia os arquivos principais e assume o controle na hora ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa TODOS os caches de versões anteriores ───
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

// ── FETCH: rede primeiro, cache como plano B (funciona offline) ──
self.addEventListener('fetch', (event) => {
  // Só intercepta requisições GET (evita quebrar POSTs de formulários etc.)
  if (event.request.method !== 'GET') return;

  // Nunca intercepta chamadas pro Supabase (login, banco, chat em tempo
  // real) — essas sempre precisam ir direto pra rede, nunca cacheadas.
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Resposta boa da rede: usa ela e atualiza a cópia salva também,
        // pra o modo offline continuar funcionando com a versão mais nova.
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Sem internet: cai pra cópia salva, se tiver.
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Offline e sem cache: se for navegação de página, tenta devolver o index como fallback
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
