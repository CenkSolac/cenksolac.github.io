// Arka plan seçimi: sol üstteki ⚙ düğmesi ve "Ayarlar" penceresi. Resimler panelden gelir (panelde "Arka planlar", veri/arkaplan.json).
// Ziyaretçinin seçimi sadece kendi cihazında saklanır. Sitenin renkleri (düğmeler, çizgiler, vurgu) seçilen resme göre ayarlanır.
// Novel bölümü ve günlük yazısı okurken resim gösterilmez, sadece renkler uyar.
(function () {
  "use strict";
  var SECIM = "arkaplan", ONBELLEK = "arkaplan-on", YOK = "yok";
  var PERDE = { az: [58, 72], orta: [72, 84], cok: [84, 92] };
  var ADLAR = ["bg", "koyu", "yuzey", "parlak", "cizgi", "yazi", "soluk", "vurgu"];
  var kok = document.documentElement, veri = null, pencere = null, izgara = null, sira = 0;

  function depo(a, b) {
    try {
      if (b === undefined) return localStorage.getItem(a);
      if (b === null) localStorage.removeItem(a); else localStorage.setItem(a, b);
    } catch (_) {}
    return null;
  }
  function e(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function resimYolu(u) {
    u = String(u || "").trim();
    return /^\/(?!\/)[^"'()\\\s<>]*$/.test(u) ? encodeURI(decodeURI(u)) : "";
  }
  function hexMi(s) { return /^#[0-9a-f]{6}$/i.test(String(s || "").trim()); }

  // Okuma sayfaları: resim yok, sadece renk
  var yol = location.pathname.replace(/\.html$/, ""), sorgu = new URLSearchParams(location.search);
  if ((/\/novel$/.test(yol) && sorgu.get("b")) || (/\/gunluk$/.test(yol) && sorgu.get("y"))) kok.setAttribute("data-ap-sade", "");

  // ---------------------------------------------------------------- Renk hesabı
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    function f(n) {
      var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }
    return [f(0), f(8), f(4)];
  }
  function rgb2hsl(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, Math.min(1, s), l];
  }
  function hex(c) {
    return "#" + c.map(function (v) { v = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16); return v.length < 2 ? "0" + v : v; }).join("");
  }
  function parlaklik(c) {
    var a = c.map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function kontrast(a, b) { var x = parlaklik(a), y = parlaklik(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Bir ana renkten (ton + doygunluk) sitenin koyu renk takımını üretir. Yazılar her zaman okunur kalır.
  function palet(h, s) {
    var z = Math.min(0.42, 0.1 + s * 0.5); // zemin doygunluğu
    var yuzey = hsl2rgb(h, z, 0.12), v, l = 0.6, vs = s < 0.12 ? s : Math.max(0.5, Math.min(0.92, s));
    do { v = hsl2rgb(h, vs, l); l += 0.02; } while (kontrast(v, yuzey) < 6.5 && l < 0.92);
    return {
      bg: hex(hsl2rgb(h, z, 0.07)), koyu: hex(hsl2rgb(h, z, 0.095)), yuzey: hex(yuzey), parlak: hex(hsl2rgb(h, z, 0.17)),
      cizgi: hex(hsl2rgb(h, z * 0.9, 0.22)), yazi: hex(hsl2rgb(h, 0.3, 0.94)), soluk: hex(hsl2rgb(h, 0.16, 0.7)), vurgu: hex(v)
    };
  }
  function hexPalet(s) {
    s = s.trim();
    var c = rgb2hsl(parseInt(s.substr(1, 2), 16) / 255, parseInt(s.substr(3, 2), 16) / 255, parseInt(s.substr(5, 2), 16) / 255);
    return palet(c[0], c[1]);
  }
  // Resmin baskın canlı rengini bulur
  function resimdenPalet(yol) {
    return new Promise(function (tamam) {
      var im = new Image();
      im.onload = function () {
        try {
          var n = 48, cv = document.createElement("canvas"); cv.width = cv.height = n;
          var cx = cv.getContext("2d"); cx.drawImage(im, 0, 0, n, n);
          var d = cx.getImageData(0, 0, n, n).data, kutu = [], i, k;
          for (k = 0; k < 24; k++) kutu.push({ w: 0, x: 0, y: 0, s: 0 });
          for (i = 0; i < d.length; i += 4) {
            var c = rgb2hsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
            var w = c[1] * c[1] * (1 - Math.abs(c[2] - 0.5) * 1.6);
            if (w <= 0.01) continue;
            var b = kutu[Math.floor(c[0] / 15) % 24], r = c[0] * Math.PI / 180;
            b.w += w; b.x += Math.cos(r) * w; b.y += Math.sin(r) * w; b.s += c[1] * w;
          }
          var en = null, top = 0;
          for (k = 0; k < 24; k++) {
            var o = kutu[(k + 23) % 24], s = kutu[(k + 1) % 24];
            var t = kutu[k].w + (o.w + s.w) * 0.5; // komşu tonlarla birlikte say
            if (t > top) { top = t; en = kutu[k]; }
          }
          if (!en || top < n * n * 0.004) { tamam(palet(220, 0.08)); return; } // renksiz (gri) resim
          var ton = Math.atan2(en.y, en.x) * 180 / Math.PI;
          tamam(palet(ton, en.s / en.w));
        } catch (_) { tamam(null); }
      };
      im.onerror = function () { tamam(null); };
      im.src = yol;
    });
  }

  // ---------------------------------------------------------------- Uygulama
  function uygula(o) {
    var st = kok.style, m = document.querySelector('meta[name="theme-color"]');
    if (!o || !o.palet || !o.resim) {
      ADLAR.forEach(function (a) { st.removeProperty("--ap-" + a); });
      st.removeProperty("--ap-resim"); st.removeProperty("--ap-perde"); st.removeProperty("--ap-perde2");
      kok.removeAttribute("data-ap");
      if (m && m.dataset.ilk) m.content = m.dataset.ilk;
      return;
    }
    ADLAR.forEach(function (a) { if (hexMi(o.palet[a])) st.setProperty("--ap-" + a, o.palet[a]); });
    var p = PERDE[o.koyuluk] || PERDE.orta;
    st.setProperty("--ap-resim", 'url("' + o.resim + '")');
    st.setProperty("--ap-perde", p[0] + "%"); st.setProperty("--ap-perde2", p[1] + "%");
    kok.setAttribute("data-ap", "");
    if (m && !kok.hasAttribute("data-tema")) { if (!m.dataset.ilk) m.dataset.ilk = m.content; m.content = o.palet.bg; }
  }
  function onbellekOku() { try { return JSON.parse(depo(ONBELLEK) || "null"); } catch (_) { return null; } }

  // Sayfa çizilmeden önce: son kullanılan renkleri hemen uygula (renk sıçraması olmasın)
  var on = onbellekOku();
  if (on && resimYolu(on.resim) === on.resim) uygula(on);

  function liste() {
    if (!veri || veri.aktif !== true || !Array.isArray(veri.liste)) return [];
    return veri.liste.map(function (x) {
      return x && {
        ad: String(x.ad || "").trim(), ad_en: String(x.ad_en || "").trim(), resim: resimYolu(x.resim),
        renk: hexMi(x.renk) ? String(x.renk).trim().toLowerCase() : "", koyuluk: PERDE[x.koyuluk] ? x.koyuluk : "orta", varsayilan: x.varsayilan === true
      };
    }).filter(function (x) { return x && x.resim; });
  }
  function secili(l) {
    var s = depo(SECIM), i;
    if (s === YOK) return null;
    for (i = 0; i < l.length; i++) if (l[i].resim === s) return l[i];
    for (i = 0; i < l.length; i++) if (l[i].varsayilan) return l[i];
    return null;
  }
  function gecir(x) {
    var no = ++sira;
    if (!x) { depo(ONBELLEK, null); uygula(null); return Promise.resolve(); }
    var imza = [x.resim, x.renk, x.koyuluk].join("|"), c = onbellekOku();
    if (c && c.imza === imza) { uygula(c); return Promise.resolve(); }
    return (x.renk ? Promise.resolve(hexPalet(x.renk)) : resimdenPalet(x.resim)).then(function (p) {
      if (no !== sira) return;
      if (!p) p = palet(220, 0.3);
      var o = { imza: imza, resim: x.resim, koyuluk: x.koyuluk, palet: p };
      depo(ONBELLEK, JSON.stringify(o)); uygula(o);
    });
  }

  // ---------------------------------------------------------------- Pencere
  function isaretle() {
    if (!izgara) return;
    var s = secili(liste()), deger = s ? s.resim : YOK;
    Array.prototype.forEach.call(izgara.children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.deger === deger)); });
  }
  function secenek(deger, ad, resim) {
    var b = e("button", "ap-secenek"); b.type = "button"; b.dataset.deger = deger;
    var k = e("span", "ap-kucuk" + (resim ? "" : " bos"));
    if (resim) k.style.backgroundImage = 'url("' + resim + '")';
    var y = e("span", "ap-ad", ad); if (resim) y.setAttribute("data-dil-yok", "");
    b.append(k, y);
    b.onclick = function () {
      depo(SECIM, deger);
      var l = liste();
      gecir(secili(l)); isaretle();
    };
    return b;
  }
  function pencereYap() {
    var d = document.createElement("dialog");
    d.className = "bildirim-pencere ayar-pencere"; d.setAttribute("aria-label", "Ayarlar");
    d.addEventListener("click", function (ev) { if (ev.target === d) d.close(); });
    var ust = e("div", "bildirim-ust"), kapat = e("button", "dgm", "Kapat"); kapat.type = "button"; kapat.onclick = function () { d.close(); };
    ust.append(e("strong", null, "Ayarlar"), kapat);
    var govde = e("div", "bildirim-govde");
    govde.append(e("h3", "ayar-baslik", "Arka plan"), e("p", "bildirim-giris", "Sitenin arka planını seç. Renkler seçtiğin resme göre değişir. Seçimin sadece bu cihazda saklanır."));
    izgara = e("div", "ap-izgara");
    var en = kok.lang === "en";
    izgara.append(secenek(YOK, "Sade (resimsiz)", ""));
    liste().forEach(function (x, i) { izgara.append(secenek(x.resim, (en && x.ad_en) || x.ad || (en ? "Background " : "Arka plan ") + (i + 1), x.resim)); });
    govde.append(izgara, e("p", "ayar-not", "Novel bölümü ve günlük yazısı okurken arka plan sade kalır."));
    d.append(ust, govde); document.body.append(d);
    return d;
  }
  function ac() {
    if (!pencere) pencere = pencereYap();
    isaretle();
    try { pencere.showModal(); } catch (_) { pencere.setAttribute("open", ""); }
  }
  function dugmeKoy() {
    var ust = document.querySelector("header.ust"), marka = ust && ust.querySelector(".marka");
    if (!marka || ust.querySelector(".ayar-dugme")) return;
    var b = e("button", "ayar-dugme"); b.type = "button";
    b.setAttribute("aria-label", "Ayarlar"); b.title = "Ayarlar";
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    b.onclick = ac;
    marka.after(b); ust.classList.add("ayarli");
  }

  // ---------------------------------------------------------------- Başlangıç
  fetch("/veri/arkaplan.json").then(function (r) { return r.json(); }).then(function (d) {
    veri = d;
    var l = liste();
    gecir(secili(l));
    if (!l.length) return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", dugmeKoy); else dugmeKoy();
  }).catch(function () {});
})();
