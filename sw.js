/* Evakor – võrguta töö (service worker)
   Uue versiooni avaldamisel muuda VERSIOON, siis uuendavad telefonid vahemälu. */
const VERSIOON = 'evakor-2026-11-25cg';
/* suured skeemifailid eraldi vahemälus – ei kustu äpi uuendamisel; uus versioon = uus ?v= */
const SUURED = 'evakor-suured';
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
  './lib/jspdf.plugin.autotable.min.js',
  './lib/skeemid.js'
];
/* lib/skeemid_vj.js (VJ skeemid, ~7.5 MB) ei ole siin: see laetakse alles VJ skeemi avamisel ja jääb siis vahemällu */

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
      .then(k => Promise.all(k.filter(n => n !== VERSIOON && n !== SUURED).map(n => caches.delete(n))))
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
    /* cache:'no-cache' – ei kasuta GitHubi 10 min vahemälu, uus versioon tuleb kohe */
    const vorgust = fetch(url.origin + url.pathname, { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
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

  /* VJ skeemid ja nende PDF-id (terav suum): oma vahemälust (täpne ?v=), puudumisel võrgust ja jäta meelde; vanad versioonid kustu */
  if (url.pathname.endsWith('/lib/skeemid_vj.js') || url.pathname.includes('/lib/vj/')) {
    e.respondWith(caches.open(SUURED).then(c => c.match(req).then(v => v || fetch(req).then(r => {
      if (r.ok) { const k = r.clone();
        c.keys().then(ks => Promise.all(ks.filter(q => new URL(q.url).pathname === url.pathname && q.url !== req.url).map(q => c.delete(q)))).then(() => c.put(req, k)); }
      return r;
    }))));
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
