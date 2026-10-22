// Telefona uygulama gibi eklenebilmesi için. Önce internetten çeker; internet yoksa son görülen sayfayı gösterir.
const SURUM = "v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((x) => x !== SURUM).map((x) => caches.delete(x)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (ev) => {
  const r = ev.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/admin") || u.pathname === "/sw.js") return;
  if (r.headers.has("range") || r.destination === "video" || r.destination === "audio") return;
  ev.respondWith(
    fetch(r).then((yanit) => {
      if (yanit.ok && yanit.type === "basic") {
        const kopya = yanit.clone();
        caches.open(SURUM).then((c) => c.put(r, kopya)).catch(() => {});
      }
      return yanit;
    }).catch(() => caches.match(r).then((c) => c || (r.mode === "navigate" ? caches.match("/") : undefined) || Response.error()))
  );
});
