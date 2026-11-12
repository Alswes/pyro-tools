/* Pyro Tools · service worker (v0.15)
   Só deixa o Pyro instalável e abrir sem internet com a última versão vista.
   - Páginas e arquivos do próprio site: sempre busca na rede primeiro (deploy novo aparece na hora);
     sem rede, usa a cópia guardada.
   - Banco (Firestore), login e qualquer outro site: nunca passam por aqui nem são guardados. */
const CACHE = 'pyro-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/__/')) return; /* rotas internas do Firebase Hosting */
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === 'basic') { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); }
    return res;
  }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
