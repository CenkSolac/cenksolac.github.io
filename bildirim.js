// Bildirim düğmesi ve seçim penceresi. Ayar: veri/bildirim.json (panelde "Bildirimler"). "aktif" kapalıysa hiçbir şey görünmez.
// Ziyaretçi düğmeye basıp izin vermedikçe hiçbir şey kaydedilmez. Sunucu: sunucu/bildirim-sunucu.js
(function () {
  "use strict";
  var TURLER = [["canli", "Canlı yayın başlayınca"], ["novel", "Yeni novel bölümü çıkınca"]];
  var DEPO = "bildirim", TERCIH = "bildirim-tercih";
  var dil = document.documentElement.lang === "en" ? "en" : "tr";
  var api = "", pencere = null, durumYazi = null, kutular = {}, kaydetBtn = null, kapatBtn = null, kimlikYazi = null;

  function e(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function oku() { try { return JSON.parse(localStorage.getItem(DEPO) || "null"); } catch (_) { return null; } }
  function yaz(v) { try { if (v) localStorage.setItem(DEPO, JSON.stringify(v)); else localStorage.removeItem(DEPO); } catch (_) {} }
  function destek() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }
  function anahtarBayt(s) {
    s = String(s).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var r = atob(s), a = new Uint8Array(r.length);
    for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
    return a;
  }
  function ayniAnahtar(a, b) {
    if (!a) return false;
    a = new Uint8Array(a);
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function istek(yol, govde) {
    return fetch(api + yol, {
      method: govde ? "POST" : "GET",
      headers: govde ? { "Content-Type": "application/json" } : undefined,
      body: govde ? JSON.stringify(govde) : undefined,
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  // Servis kodu (sw.js) bildirim gösterirken bu ayarı okur
  function tercihiCihazaYaz(kat, goruldu) {
    if (!window.caches) return Promise.resolve();
    return caches.open(TERCIH).then(function (c) {
      return c.match("/__tercih").then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; }).then(function (eski) {
        var yeni = { dil: dil, kat: kat, goruldu: goruldu || eski.goruldu || [] };
        return c.put("/__tercih", new Response(JSON.stringify(yeni), { headers: { "Content-Type": "application/json" } }));
      });
    }).catch(function () {});
  }
  function kayitHazir() {
    return navigator.serviceWorker.register("/sw.js").then(function () { return navigator.serviceWorker.ready; });
  }
  function aboneOl(kat) {
    var anahtar;
    return istek("/api/anahtar").then(function (r) {
      if (!r.ok || !r.j.publicKey) throw new Error("anahtar");
      anahtar = anahtarBayt(r.j.publicKey);
      return kayitHazir();
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub && sub.options && !ayniAnahtar(sub.options.applicationServerKey, anahtar)) {
          return sub.unsubscribe().then(function () { return null; });
        }
        return sub;
      }).then(function (sub) {
        return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: anahtar });
      });
    }).then(function (sub) {
      return istek("/api/abone", { endpoint: sub.endpoint, kat: kat, dil: dil }).then(function (r) {
        if (!r.ok) throw new Error("abone");
        yaz({ kat: kat, id: r.j.id, dil: dil, t: Date.now() });
        return tercihiCihazaYaz(kat).then(function () { return r.j.id; });
      });
    });
  }
  function aboneligiBitir() {
    return kayitHazir().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      var kayit = oku();
      var govde = sub ? { endpoint: sub.endpoint } : (kayit && kayit.id ? { id: kayit.id } : null);
      var p = govde ? istek("/api/sil", govde).catch(function () {}) : Promise.resolve();
      return p.then(function () { return sub ? sub.unsubscribe() : true; });
    }).then(function () {
      yaz(null);
      return window.caches ? caches.delete(TERCIH) : null;
    });
  }

  // ---- Pencere ----
  function mesaj(t, hata) {
    durumYazi.textContent = t || "";
    durumYazi.className = "bildirim-durum" + (hata ? " hata" : "");
  }
  function pencereYap() {
    var d = document.createElement("dialog");
    d.className = "bildirim-pencere";
    d.setAttribute("aria-label", "Bildirimler");
    d.addEventListener("click", function (ev) { if (ev.target === d) d.close(); });
    var ust = e("div", "bildirim-ust");
    var kapat = e("button", "dgm", "Kapat"); kapat.type = "button"; kapat.onclick = function () { d.close(); };
    ust.append(e("strong", null, "Bildirimler"), kapat);
    var govde = e("div", "bildirim-govde");
    govde.append(e("p", "bildirim-giris", "İstediğin bildirimleri seç. Ad, e-posta ya da telefon numarası istemiyorum."));
    TURLER.forEach(function (t) {
      var l = e("label", "bildirim-secenek"), c = document.createElement("input");
      c.type = "checkbox"; c.value = t[0]; kutular[t[0]] = c;
      l.append(c, e("span", null, t[1])); govde.append(l);
    });
    durumYazi = e("p", "bildirim-durum"); durumYazi.setAttribute("role", "status");
    kaydetBtn = e("button", "dugme bildirim-kaydet", "Bildirimleri aç"); kaydetBtn.type = "button";
    kaydetBtn.onclick = kaydet;
    kapatBtn = e("button", "bildirim-kapat-btn", "Bildirimleri kapat"); kapatBtn.type = "button";
    kapatBtn.onclick = kapatTikla;
    kimlikYazi = e("p", "bildirim-kimlik"); kimlikYazi.setAttribute("data-dil-yok", "");
    var gz = e("a", "bildirim-gizlilik", "Gizlilik bilgisi"); gz.href = "/gizlilik";
    govde.append(durumYazi, kaydetBtn, kapatBtn, kimlikYazi, gz);
    d.append(ust, govde);
    document.body.append(d);
    return d;
  }
  function secililer() { return TURLER.map(function (t) { return t[0]; }).filter(function (k) { return kutular[k].checked; }); }
  function durumuYansit() {
    var kayit = oku(), izin = destek() ? Notification.permission : "yok";
    var acik = !!kayit && izin === "granted";
    TURLER.forEach(function (t) { kutular[t[0]].checked = acik ? (kayit.kat || []).indexOf(t[0]) >= 0 : t[0] === "canli"; });
    kaydetBtn.textContent = acik ? "Kaydet" : "Bildirimleri aç";
    kapatBtn.hidden = !acik;
    kimlikYazi.textContent = acik && kayit.id ? "Kimlik: " + kayit.id : "";
    kimlikYazi.hidden = !(acik && kayit.id);
    if (!destek()) {
      mesaj(/iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "iPhone'da önce siteyi ana ekrana ekle (Paylaş > Ana Ekrana Ekle), sonra oradan açıp tekrar dene."
        : "Bu tarayıcı bildirimleri desteklemiyor.", true);
      kaydetBtn.disabled = true;
    } else if (izin === "denied") {
      mesaj("Bildirimlere izin verilmedi. Tarayıcının site ayarlarından izin verebilirsin.", true);
    } else if (acik) {
      mesaj("Bildirimler açık. İstediğin zaman buradan değiştirebilirsin.");
    } else mesaj("");
  }
  function kaydet() {
    if (!destek()) return;
    var kat = secililer();
    if (!kat.length) { mesaj("En az bir tür seç.", true); return; }
    kaydetBtn.disabled = true;
    // İzin penceresi ancak tıklamanın içinde açılır; bu yüzden ilk iş budur
    var izin = Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    Promise.resolve(izin).then(function (sonuc) {
      if (sonuc !== "granted") { durumuYansit(); throw new Error("izin"); }
      return aboneOl(kat);
    }).then(function () { durumuYansit(); }).catch(function (x) {
      if (!x || x.message !== "izin") mesaj("Bir sorun çıktı. Biraz sonra tekrar dene.", true);
    }).then(function () { kaydetBtn.disabled = !destek(); });
  }
  function kapatTikla() {
    kapatBtn.disabled = true;
    aboneligiBitir().then(function () { durumuYansit(); mesaj("Bildirimler kapatıldı."); }).catch(function () {
      mesaj("Bir sorun çıktı. Biraz sonra tekrar dene.", true);
    }).then(function () { kapatBtn.disabled = false; });
  }
  function ac() {
    if (!pencere) pencere = pencereYap();
    durumuYansit();
    try { pencere.showModal(); } catch (_) { pencere.setAttribute("open", ""); }
  }

  // ---- Düğme ----
  function dugmeKoy() {
    var ust = document.querySelector("header.ust");
    if (!ust || document.querySelector(".bildirim-dugme")) return;
    var b = e("button", "bildirim-dugme"); b.type = "button";
    b.setAttribute("aria-label", "Bildirimler"); b.title = "Bildirimler";
    b.append(e("span", "bildirim-zil", "🔔"), e("span", "bildirim-etiket", "Bildirimler"));
    b.onclick = ac;
    ust.insertBefore(b, ust.querySelector(".dil-secici") || null);
  }

  // ---- Açık aboneliği sessizce güncel tut (dil değişti mi, adres yenilendi mi) ----
  function senkron() {
    var k = oku();
    if (!k || !destek() || Notification.permission !== "granted") return;
    var eskidi = !k.t || Date.now() - k.t > 7 * 864e5;
    if (k.dil === dil && !eskidi) { tercihiCihazaYaz(k.kat || []); return; }
    aboneOl(k.kat || []).catch(function () {});
  }

  function basla() {
    fetch("/veri/bildirim.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (a) {
      if (!a || a.aktif !== true || !/^https:\/\/[^\s]+$/.test(String(a.api || ""))) return;
      try { api = new URL(String(a.api)).origin; } catch (_) { return; } // sonuna yol eklenmişse (örn. /yonetim) yok sayılır
      dugmeKoy();
      senkron();
    }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla); else basla();
})();
