/* Rovalis – võrguta töö (service worker)
   Uue versiooni avaldamisel muuda VERSIOON, siis uuendavad telefonid vahemälu. */
const VERSIOON = 'rovalis-2026-10-05y';
const FAILID = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './lib/xlsx.full.min.js',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './lib/qrcode.min.js',
  './lib/jsQR.js',
  './lib/exceljs.min.js',
  './lib/jspdf.umd.min.js',
  './lib/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSIOON)
      .then(c => c.addAll(FAILID.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== VERSIOON).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Äpi leht: proovi võrgust (et uuendused jõuaksid kohe kohale), ilma netita vahemälust */
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    /* nõrga levi korral ei oota üle 4 s – siis avatakse salvestatud versioon */
    const vorgust = fetch(req).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(VERSIOON).then(c => c.put('./index.html', k)); }
      return r;
    });
    const malust = () => caches.match('./index.html', { ignoreSearch: true });
    e.respondWith(new Promise(resolve => {
      let valmis = false;
      const anna = r => { if (!valmis && r) { valmis = true; resolve(r); } };
      const t = setTimeout(() => malust().then(anna), 4000);
      vorgust.then(r => { clearTimeout(t); anna(r); })
        .catch(() => { clearTimeout(t); malust().then(r => r ? anna(r) : anna(new Response('Võrguühendus puudub', { status: 503 }))); });
    }));
    return;
  }

  /* Teegid ja ikoonid: vahemälust, puudumisel võrgust */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(v => v || fetch(req).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(VERSIOON).then(c => c.put(req, k)); }
      return r;
    }))
  );
});
