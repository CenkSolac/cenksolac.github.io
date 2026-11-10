// Ayarlar penceresi (sol üstteki ⚙ düğmesi): arka plan, bildirimler ve dil. Resimler panelden gelir (panelde "Arka planlar", veri/arkaplan.json).
// Ziyaretçi kendi resmini de yükleyebilir; o resim ve seçim sadece kendi cihazında saklanır, hiçbir yere gönderilmez. Sitenin renkleri (düğmeler, çizgiler, vurgu) seçilen resme göre ayarlanır.
// Novel bölümü ve günlük yazısı okurken resim gösterilmez, sadece renkler uyar.
(function () {
  "use strict";
  var SECIM = "arkaplan", ONBELLEK = "arkaplan-on", KENDI_DEPO = "arkaplan-kendi", YOK = "yok", KENDI = "kendi";
  var PERDE = { az: [58, 72], orta: [72, 84], cok: [84, 92] };
  var ADLAR = ["bg", "koyu", "yuzey", "parlak", "cizgi", "yazi", "soluk", "vurgu"];
  var kok = document.documentElement, veri = null, pencere = null, govde = null, izgara = null, durum = "", sira = 0;

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
  function kendiOku() {
    var v = depo(KENDI_DEPO);
    return v && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+\/=]+$/.test(v) ? v : "";
  }
  function kendiYaz(v) { try { localStorage.setItem(KENDI_DEPO, v); return true; } catch (_) { return false; } }
  function adres(r) { return r === KENDI ? kendiOku() : r; }
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
    var yol = o && o.palet ? adres(o.resim) : "";
    if (!yol) {
      ADLAR.forEach(function (a) { st.removeProperty("--ap-" + a); });
      st.removeProperty("--ap-resim"); st.removeProperty("--ap-perde"); st.removeProperty("--ap-perde2");
      kok.removeAttribute("data-ap");
      if (m && m.dataset.ilk) m.content = m.dataset.ilk;
      return;
    }
    ADLAR.forEach(function (a) { if (hexMi(o.palet[a])) st.setProperty("--ap-" + a, o.palet[a]); });
    var p = PERDE[o.koyuluk] || PERDE.orta;
    st.setProperty("--ap-resim", 'url("' + yol + '")');
    st.setProperty("--ap-perde", p[0] + "%"); st.setProperty("--ap-perde2", p[1] + "%");
    kok.setAttribute("data-ap", "");
    if (m && !kok.hasAttribute("data-tema")) { if (!m.dataset.ilk) m.dataset.ilk = m.content; m.content = o.palet.bg; }
  }
  function onbellekOku() { try { return JSON.parse(depo(ONBELLEK) || "null"); } catch (_) { return null; } }

  // Sayfa çizilmeden önce: son kullanılan renkleri hemen uygula (renk sıçraması olmasın)
  var on = onbellekOku();
  if (on && (on.resim === KENDI || resimYolu(on.resim) === on.resim)) uygula(on);

  function acik() { return !!veri && veri.aktif === true; }
  function liste() {
    if (!acik() || !Array.isArray(veri.liste)) return [];
    return veri.liste.map(function (x) {
      return x && {
        ad: String(x.ad || "").trim(), ad_en: String(x.ad_en || "").trim(), resim: resimYolu(x.resim),
        renk: hexMi(x.renk) ? String(x.renk).trim().toLowerCase() : "", koyuluk: PERDE[x.koyuluk] ? x.koyuluk : "orta", varsayilan: x.varsayilan === true
      };
    }).filter(function (x) { return x && x.resim; });
  }
  function secili(l) {
    var s = depo(SECIM), i;
    if (s === YOK || !acik()) return null;
    if (s === KENDI && kendiOku()) return { resim: KENDI, renk: "", koyuluk: "orta" };
    for (i = 0; i < l.length; i++) if (l[i].resim === s) return l[i];
    for (i = 0; i < l.length; i++) if (l[i].varsayilan) return l[i];
    return null;
  }
  function gecir(x) {
    var no = ++sira;
    if (!x) { depo(ONBELLEK, null); uygula(null); return Promise.resolve(); }
    var yol = adres(x.resim), imza = [x.resim === KENDI ? KENDI + yol.length + yol.slice(-16) : x.resim, x.renk, x.koyuluk].join("|"), c = onbellekOku();
    if (c && c.imza === imza) { uygula(c); return Promise.resolve(); }
    return (x.renk ? Promise.resolve(hexPalet(x.renk)) : resimdenPalet(yol)).then(function (p) {
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
  function sec(deger) { depo(SECIM, deger); gecir(secili(liste())); isaretle(); }
  function secenek(deger, ad, resim, cevrilmesin) {
    var b = e("button", "ap-secenek"); b.type = "button"; b.dataset.deger = deger;
    var k = e("span", "ap-kucuk" + (resim ? "" : " bos"));
    if (resim) k.style.backgroundImage = 'url("' + resim + '")';
    var y = e("span", "ap-ad", ad); if (cevrilmesin) y.setAttribute("data-dil-yok", "");
    b.append(k, y);
    b.onclick = function () { sec(deger); };
    return b;
  }
  // Ziyaretçinin kendi resmi: küçültülür ve sadece bu cihazın deposuna yazılır
  function kendiYukle(dosya) {
    if (!dosya) return;
    var u = URL.createObjectURL(dosya), im = new Image();
    function bitti(mesaj) { URL.revokeObjectURL(u); durum = mesaj || ""; doldur(); }
    im.onload = function () {
      var denemeler = [[1600, 0.82], [1200, 0.72], [900, 0.6]], i, tamam = false;
      try {
        for (i = 0; i < denemeler.length && !tamam; i++) {
          var o = Math.min(1, denemeler[i][0] / Math.max(im.naturalWidth, im.naturalHeight));
          var cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(im.naturalWidth * o)); cv.height = Math.max(1, Math.round(im.naturalHeight * o));
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          tamam = kendiYaz(cv.toDataURL("image/jpeg", denemeler[i][1])) && !!kendiOku();
        }
      } catch (_) { tamam = false; }
      if (!tamam) { bitti("Resim kaydedilemedi. Başka bir resim dene."); return; }
      depo(SECIM, KENDI); gecir(secili(liste())); bitti("");
    };
    im.onerror = function () { bitti("Bu dosya resim olarak açılamadı."); };
    im.src = u;
  }
  function dilBolumu() {
    var k = e("div", "ayar-satir"); k.setAttribute("data-dil-yok", "");
    [["tr", "Türkçe"], ["en", "English"]].forEach(function (x) {
      var b = e("button", "dgm ayar-secim", x[1]); b.type = "button"; b.lang = x[0];
      b.setAttribute("aria-pressed", String(kok.lang === x[0]));
      b.onclick = function () { if (kok.lang === x[0]) return; depo("dil", x[0]); location.reload(); };
      k.append(b);
    });
    return k;
  }
  function doldur() {
    if (!govde) return;
    var en = kok.lang === "en", parca = [];
    izgara = null;
    if (acik()) {
      var kendi = kendiOku();
      izgara = e("div", "ap-izgara");
      izgara.append(secenek(YOK, "Sade (resimsiz)", ""));
      liste().forEach(function (x, i) { izgara.append(secenek(x.resim, (en && x.ad_en) || x.ad || (en ? "Background " : "Arka plan ") + (i + 1), x.resim, true)); });
      if (kendi) izgara.append(secenek(KENDI, "Kendi resmin", kendi));
      var satir = e("div", "ayar-satir"), giris = document.createElement("input");
      giris.type = "file"; giris.accept = "image/*"; giris.hidden = true;
      giris.onchange = function () { kendiYukle(giris.files && giris.files[0]); };
      var yukle = e("button", "dgm", kendi ? "Resmi değiştir" : "Kendi resmini yükle"); yukle.type = "button";
      yukle.onclick = function () { giris.click(); };
      satir.append(giris, yukle);
      if (kendi) {
        var sil = e("button", "bildirim-kapat-btn", "Resmi kaldır"); sil.type = "button";
        sil.onclick = function () { depo(KENDI_DEPO, null); if (depo(SECIM) === KENDI) depo(SECIM, null); gecir(secili(liste())); durum = ""; doldur(); };
        satir.append(sil);
      }
      parca.push(e("h3", "ayar-baslik", "Arka plan"),
        e("p", "bildirim-giris", "Sitenin arka planını seç. Renkler seçtiğin resme göre değişir. Seçimin sadece bu cihazda saklanır."), izgara, satir);
      if (durum) { var d = e("p", "bildirim-durum hata", durum); d.setAttribute("role", "status"); parca.push(d); }
      parca.push(e("p", "ayar-not", "Kendi yüklediğin resim sadece bu cihazda durur, hiçbir yere gönderilmez. Novel bölümü ve günlük yazısı okurken arka plan sade kalır."));
    }
    if (window.Bildirim && window.Bildirim.ac) {
      var bs = e("div", "ayar-satir"), bb = e("button", "dgm", "🔔 Bildirim ayarları"); bb.type = "button";
      bb.onclick = function () { pencere.close(); window.Bildirim.ac(); };
      bs.append(bb);
      parca.push(e("h3", "ayar-baslik ayar-ara", "Bildirimler"), e("p", "bildirim-giris", "Canlı yayın başlayınca ve yeni bölüm çıkınca haber al."), bs);
    }
    var db = e("h3", "ayar-baslik ayar-ara", "Dil"); db.setAttribute("data-dil-yok", ""); db.textContent = "Dil / Language";
    parca.push(db, dilBolumu());
    govde.replaceChildren.apply(govde, parca);
    if (parca[0]) parca[0].classList.remove("ayar-ara");
    isaretle();
  }
  function pencereYap() {
    var d = document.createElement("dialog");
    d.className = "bildirim-pencere ayar-pencere"; d.setAttribute("aria-label", "Ayarlar");
    d.addEventListener("click", function (ev) { if (ev.target === d) d.close(); });
    var ust = e("div", "bildirim-ust"), kapat = e("button", "dgm", "Kapat"); kapat.type = "button"; kapat.onclick = function () { d.close(); };
    ust.append(e("strong", null, "Ayarlar"), kapat);
    govde = e("div", "bildirim-govde");
    d.append(ust, govde); document.body.append(d);
    return d;
  }
  function ac() {
    if (!pencere) pencere = pencereYap();
    durum = ""; doldur();
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", dugmeKoy); else dugmeKoy();
  fetch("/veri/arkaplan.json").then(function (r) { return r.json(); }).then(function (d) {
    veri = d;
    gecir(secili(liste()));
    if (pencere && pencere.open) doldur();
  }).catch(function () {});
})();
