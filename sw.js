// Telefona uygulama gibi eklenebilmesi için. Önce internetten çeker; internet yoksa son görülen sayfayı gösterir.
const SURUM = "v1";
const TERCIH = "bildirim-tercih"; // bildirim ayarları (sayfa yazar, bu dosya okur); aşağıdaki temizlikte silinmez
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((x) => x !== SURUM && x !== TERCIH).map((x) => caches.delete(x)))).then(() => self.clients.claim())
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

// ---------------------------------------------------------------- Bildirimler
// Sunucu bize boş bir "dürtme" yollar; mesajı /api/mesajlar adresinden okuyup gösteririz.
async function tercihOku() {
  try { const c = await caches.open(TERCIH), r = await c.match("/__tercih"); return r ? await r.json() : {}; } catch (_) { return {}; }
}
async function tercihYaz(t) {
  try {
    const c = await caches.open(TERCIH);
    await c.put("/__tercih", new Response(JSON.stringify(t), { headers: { "Content-Type": "application/json" } }));
  } catch (_) {}
}
async function bildirimGoster() {
  const t = await tercihOku();
  const dil = t.dil === "en" ? "en" : "tr";
  const kat = Array.isArray(t.kat) ? t.kat : [];
  const goruldu = Array.isArray(t.goruldu) ? t.goruldu : [];
  let liste = [];
  try {
    const ayar = await (await fetch("/veri/bildirim.json", { cache: "no-store" })).json();
    liste = await (await fetch(String(ayar.api).replace(/\/+$/, "") + "/api/mesajlar", { cache: "no-store" })).json();
  } catch (_) {}
  const yeni = (Array.isArray(liste) ? liste : [])
    .filter((m) => m && kat.includes(m.kat) && !goruldu.includes(m.id) && Date.now() - m.t < 48 * 3600e3)
    .slice(0, 3).reverse();
  const secenek = (extra) => Object.assign({ icon: "/icon-512.png", badge: "/favicon.png", lang: dil }, extra);
  if (!yeni.length) {
    // Mesaj okunamadıysa da bir şey göstermek zorundayız (tarayıcı kuralı)
    await self.registration.showNotification("CenkSolac", secenek({
      body: dil === "en" ? "There's something new on the site." : "Sitede yeni bir şey var.",
      tag: "genel", data: { url: "/" },
    }));
    return;
  }
  for (const m of yeni) {
    const d = m[dil] || m.tr || {};
    await self.registration.showNotification(d.b || "CenkSolac", secenek({
      body: d.g || "", tag: m.id, data: { url: m.url || "/" },
    }));
  }
  t.goruldu = goruldu.concat(yeni.map((m) => m.id)).slice(-30);
  await tercihYaz(t);
}
self.addEventListener("push", (ev) => ev.waitUntil(bildirimGoster()));
self.addEventListener("notificationclick", (ev) => {
  ev.notification.close();
  const hedef = new URL((ev.notification.data && ev.notification.data.url) || "/", self.location.origin).href;
  ev.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((l) => {
      for (const c of l) {
        if (c.url === hedef && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(hedef);
    })
  );
});
