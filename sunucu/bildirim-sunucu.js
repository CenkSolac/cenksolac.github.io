// CenkSolac bildirim sunucusu: Cloudflare Worker, TEK dosya, dış paket yok.
// Site bu dosyayı yayınlamaz (sunucu/ klasörü _config.yml'de hariç). Cloudflare panelinde "Edit code"a yapıştırılır.
//
// Cloudflare tarafında gereken iki bağlantı (Worker > Settings > Bindings / Variables):
//   1) KV namespace bağlantısı, adı tam olarak:  ABONELER
//   2) Gizli değişken (Secret), adı tam olarak:  YONETICI_SIFRE   (en az 10 karakter, sana özel)
//
// Nasıl çalışır: ziyaretçi bildirime izin verince tarayıcısının anonim bildirim adresi buraya kaydedilir.
// Bildirim gönderirken adrese BOŞ bir "dürtme" (push) atılır; cihazdaki site kodu (sw.js) mesajı
// /api/mesajlar adresinden okuyup gösterir. Böylece şifreleme gerekmez, kod kısa ve doğrulanabilir kalır.

const IZINLI_KAYNAKLAR = ["https://cenksolac.com", "https://www.cenksolac.com"];
// Sadece tarayıcıların gerçek bildirim servislerine istek atarız (kötüye kullanımı önler)
const PUSH_SUNUCU = /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|push\.apple\.com|notify\.windows\.com)$/i;
const KATEGORILER = ["canli", "novel"];
const PARTI = 20;            // bir seferde kaç kişiye gönderilir (ücretsiz paket sınırı için)
const MESAJ_SAYISI = 10;     // son kaç mesaj saklanır
const SITE = "https://cenksolac.com";

// ---------------------------------------------------------------- küçük yardımcılar
const te = (s) => new TextEncoder().encode(s);
function b64u(bayt) {
  if (typeof bayt === "string") bayt = te(bayt);
  let s = "";
  bayt = new Uint8Array(bayt);
  for (let i = 0; i < bayt.length; i++) s += String.fromCharCode(bayt[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(s) { return new Uint8Array(await crypto.subtle.digest("SHA-256", te(s))); }
async function kimlik(endpoint) {
  const h = await sha256(endpoint);
  return Array.from(h.slice(0, 12)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function kaynakIzni(req, env) {
  const o = req.headers.get("Origin") || "";
  const liste = IZINLI_KAYNAKLAR.concat(String(env.EK_KAYNAK || "").split(",").map((x) => x.trim()).filter(Boolean));
  return liste.includes(o) ? o : "";
}
function cevap(req, env, veri, durum, ek) {
  const h = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const o = kaynakIzni(req, env);
  if (o) { h.set("Access-Control-Allow-Origin", o); h.set("Vary", "Origin"); }
  if (ek) for (const k in ek) h.set(k, ek[k]);
  return new Response(JSON.stringify(veri), { status: durum || 200, headers: h });
}
async function govde(req) {
  const t = await req.text();
  if (t.length > 4000) throw new Error("büyük");
  return JSON.parse(t || "{}");
}
async function yoneticiMi(req, env) {
  const sifre = String(env.YONETICI_SIFRE || "");
  if (sifre.length < 10) return false; // şifre ayarlanmamışsa kimse giremez
  const g = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const a = await sha256(g), b = await sha256(sifre);
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a[i] ^ b[i];
  if (fark !== 0) { await new Promise((r) => setTimeout(r, 400)); return false; }
  return true;
}

// ---------------------------------------------------------------- VAPID (sunucunun kimliği)
async function anahtarOku(env) {
  const v = await env.ABONELER.get("vapid", "json");
  if (!v || !v.public || !v.jwk) return null;
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { public: v.public, key };
}
async function anahtarUret(env) {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const ham = await crypto.subtle.exportKey("raw", kp.publicKey); // 65 bayt
  await env.ABONELER.put("vapid", JSON.stringify({ public: b64u(ham), jwk, t: Date.now() }));
}
async function jwtYap(vapid, aud) {
  const bas = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const yuk = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE }));
  const imza = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapid.key, te(bas + "." + yuk));
  return bas + "." + yuk + "." + b64u(imza);
}

// ---------------------------------------------------------------- abonelik
function endpointGecerli(e) {
  if (typeof e !== "string" || e.length > 700) return false;
  let u;
  try { u = new URL(e); } catch (_) { return false; }
  return u.protocol === "https:" && !u.username && !u.password && PUSH_SUNUCU.test(u.hostname);
}
function katTemizle(k) {
  return Array.from(new Set((Array.isArray(k) ? k : []).map(String).filter((x) => KATEGORILER.includes(x))));
}
async function abone(req, env) {
  const b = await govde(req);
  if (!endpointGecerli(b.endpoint)) return cevap(req, env, { hata: "gecersiz_adres" }, 400);
  const kat = katTemizle(b.kat);
  const id = await kimlik(b.endpoint);
  if (!kat.length) { await env.ABONELER.delete("a:" + id); return cevap(req, env, { ok: true, id, kat: [] }); }
  const dil = b.dil === "en" ? "en" : "tr";
  const mevcut = await env.ABONELER.getWithMetadata("a:" + id);
  const m = mevcut && mevcut.metadata;
  const yeni = { k: kat.join(","), d: dil, t: (m && m.t) || Date.now() };
  if (!(mevcut && mevcut.value === b.endpoint && m && m.k === yeni.k && m.d === yeni.d)) {
    await env.ABONELER.put("a:" + id, b.endpoint, { metadata: yeni });
  }
  return cevap(req, env, { ok: true, id, kat });
}
async function sil(req, env) {
  const b = await govde(req);
  let id = "";
  if (typeof b.id === "string" && /^[a-f0-9]{24}$/.test(b.id)) id = b.id; // abone kimliği tahmin edilemez, kişiye özeldir
  else if (endpointGecerli(b.endpoint)) id = await kimlik(b.endpoint);
  else return cevap(req, env, { hata: "gecersiz_adres" }, 400);
  await env.ABONELER.delete("a:" + id);
  return cevap(req, env, { ok: true });
}

// ---------------------------------------------------------------- mesajlar (cihaz bunları okur)
async function mesajlar(req, env) {
  const l = (await env.ABONELER.get("mesajlar", "json")) || [];
  return cevap(req, env, l, 200);
}
function metin(x, ust) { return String(x == null ? "" : x).trim().slice(0, ust); }
function dilBlok(o) { return { b: metin(o && o.b, 80), g: metin(o && o.g, 200) }; }

async function gonder(req, env) {
  const b = await govde(req);
  if (!KATEGORILER.includes(b.kat)) return cevap(req, env, { hata: "kategori" }, 400);
  const tr = dilBlok(b.tr), en = dilBlok(b.en);
  if (!tr.b) return cevap(req, env, { hata: "baslik_yok" }, 400);
  if (!en.b) { en.b = tr.b; en.g = en.g || tr.g; }
  const id = metin(b.id, 40).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return cevap(req, env, { hata: "id" }, 400);
  let yol = metin(b.url, 200) || "/";
  if (/^https?:\/\//i.test(yol)) {
    if (!yol.startsWith(SITE + "/") && yol !== SITE) return cevap(req, env, { hata: "adres_baska_site" }, 400);
    yol = yol.slice(SITE.length) || "/";
  }
  if (!yol.startsWith("/") || yol.startsWith("//")) return cevap(req, env, { hata: "adres" }, 400);

  const vapid = await anahtarOku(env);
  if (!vapid) return cevap(req, env, { hata: "anahtar_yok" }, 400);

  if (!b.imlec) await mesajKaydet(env, { id, kat: b.kat, tr, en, url: yol }); // ilk grup: mesajı kaydet

  const r = await partiGonder(env, vapid, { kat: b.kat, hedef: metin(b.hedef, 40).replace(/[^a-f0-9]/g, ""), imlec: b.imlec });
  return cevap(req, env, r);
}

// Bir seferde PARTI kişiye "dürtme" yollar. Hem elle gönderme hem otomatik gönderim kullanır.
async function partiGonder(env, vapid, o) {
  const sayfa = await env.ABONELER.list({ prefix: "a:", limit: PARTI, cursor: o.imlec || undefined });
  const secilen = sayfa.keys.filter((k) => {
    if (o.hedef) return k.name === "a:" + o.hedef;
    const m = k.metadata;
    if (!m || !String(m.k || "").split(",").includes(o.kat)) return false;
    return !o.dil || (m.d === "en" ? "en" : "tr") === o.dil;
  });
  const jwtler = {};
  let gonderilen = 0, silinen = 0, basarisiz = 0, ornek = "";
  await Promise.all(secilen.map(async (k) => {
    try {
      const endpoint = await env.ABONELER.get(k.name);
      if (!endpointGecerli(endpoint)) { await env.ABONELER.delete(k.name); silinen++; return; }
      const aud = new URL(endpoint).origin;
      if (!jwtler[aud]) jwtler[aud] = jwtYap(vapid, aud);
      const jwt = await jwtler[aud];
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          TTL: String(o.kat === "canli" ? 1800 : 86400),
          Urgency: o.kat === "canli" ? "high" : "normal",
          Authorization: "vapid t=" + jwt + ", k=" + vapid.public,
        },
      });
      if (r.status === 404 || r.status === 410) { await env.ABONELER.delete(k.name); silinen++; }
      else if (r.status >= 200 && r.status < 300) gonderilen++;
      else { basarisiz++; if (!ornek) ornek = String(r.status); }
    } catch (e) { basarisiz++; if (!ornek) ornek = "ag"; }
  }));
  return {
    gonderilen, silinen, basarisiz, ornek, bakilan: sayfa.keys.length, hedeflenen: secilen.length,
    imlec: sayfa.list_complete ? null : sayfa.cursor,
  };
}

async function mesajKaydet(env, m) {
  let l = (await env.ABONELER.get("mesajlar", "json")) || [];
  l = l.filter((x) => x.id !== m.id);
  l.unshift({ id: m.id, kat: m.kat, tr: m.tr, en: m.en, url: m.url, t: Date.now() });
  await env.ABONELER.put("mesajlar", JSON.stringify(l.slice(0, MESAJ_SAYISI)));
}

// ---------------------------------------------------------------- otomatik yeni bölüm bildirimi (her dakika çalışır)
async function siteJson(yol) {
  const r = await fetch(SITE + yol + "?c=" + Date.now(), { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error("site " + r.status);
  return JSON.parse(await r.text());
}
function gunTR() { return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); }
async function bolumKontrol(env) {
  const [idx, sd] = await Promise.all([siteJson("/veri/novel-bolumler.json"), siteJson("/veri/seriler.json")]);
  const bugun = gunTR();
  const seriler = {};
  ((sd && sd.seriler) || []).forEach((x) => { if (x && x.id) seriler[x.id] = { ad: String(x.ad || x.id), dil: x.dil === "en" ? "en" : "tr" }; });
  const gorunen = []; // sitede şu an okunabilen bölümler (ileri tarihli olanlar o güne kadar sayılmaz)
  Object.keys(idx || {}).forEach((seri) => {
    (Array.isArray(idx[seri]) ? idx[seri] : []).forEach((b) => {
      const n = Number(b && b.numara);
      const t = String((b && b.tarih) || "").slice(0, 10);
      if (!Number.isFinite(n)) return;
      if (/^\d{4}-\d{2}-\d{2}$/.test(t) && t > bugun) return;
      gorunen.push({ anahtar: seri + "/" + n, seri, numara: n, baslik: String(b.baslik || "").trim() });
    });
  });
  const eski = await env.ABONELER.get("gorulen-bolumler", "json");
  if (!Array.isArray(eski)) { // ilk çalışma: var olan bölümler için bildirim gitmesin
    await env.ABONELER.put("gorulen-bolumler", JSON.stringify(gorunen.map((x) => x.anahtar)));
    return;
  }
  const bilinen = new Set(eski);
  const yeni = gorunen.filter((x) => !bilinen.has(x.anahtar));
  if (!yeni.length) return;
  // Önce "görüldü" yazılır: bir aksilik olursa aynı bölüm iki kez bildirilmez
  await env.ABONELER.put("gorulen-bolumler", JSON.stringify(eski.concat(yeni.map((x) => x.anahtar))));

  const seriAd = (x) => (seriler[x.seri] ? seriler[x.seri].ad : x.seri);
  const tekSeri = yeni.every((x) => x.seri === yeni[0].seri);
  const diller = new Set(yeni.map((x) => (seriler[x.seri] ? seriler[x.seri].dil : "tr")));
  let tr, en, yol;
  if (yeni.length === 1) {
    const g = (seriAd(yeni[0]) + ": " + (yeni[0].baslik || "Bölüm " + yeni[0].numara)).slice(0, 200);
    tr = { b: "Yeni bölüm yayında 📖", g }; en = { b: "New chapter is out 📖", g };
    yol = "/novel?s=" + encodeURIComponent(yeni[0].seri) + "&b=" + yeni[0].numara;
  } else {
    const g = (tekSeri ? seriAd(yeni[0]) + ": " : "") + yeni.length + " yeni bölüm";
    const ge = (tekSeri ? seriAd(yeni[0]) + ": " : "") + yeni.length + " new chapters";
    tr = { b: "Yeni bölümler yayında 📖", g }; en = { b: "New chapters are out 📖", g: ge };
    yol = tekSeri ? "/novel?s=" + encodeURIComponent(yeni[0].seri) : "/novel";
  }
  const id = "bolum-" + Date.now().toString(36);
  await mesajKaydet(env, { id, kat: "novel", tr: dilBlok(tr), en: dilBlok(en), url: yol });
  // Tek dilli bölümse sadece o dili seçenlere gider (İngilizce bölüm Türkçe aboneyi boşuna rahatsız etmez)
  await env.ABONELER.put("is", JSON.stringify({ kat: "novel", dil: diller.size === 1 ? Array.from(diller)[0] : "", imlec: null, t: Date.now() }));
}
async function zamanli(event, env) {
  if (!env.ABONELER) return;
  const is = await env.ABONELER.get("is", "json");
  if (is) { // bekleyen gönderim varsa bu dakika bir parti işlenir
    if (Date.now() - is.t > 3 * 3600e3) { await env.ABONELER.delete("is"); return; }
    const vapid = await anahtarOku(env);
    if (!vapid) { await env.ABONELER.delete("is"); return; }
    const r = await partiGonder(env, vapid, { kat: is.kat, dil: is.dil, imlec: is.imlec });
    if (r.imlec) { is.imlec = r.imlec; await env.ABONELER.put("is", JSON.stringify(is)); }
    else await env.ABONELER.delete("is");
    return;
  }
  if (new Date(event.scheduledTime).getUTCMinutes() % 10 !== 0) return; // yeni bölüm 10 dakikada bir aranır
  await bolumKontrol(env);
}

async function durum(req, env) {
  const say = { toplam: 0, canli: 0, novel: 0, tr: 0, en: 0 };
  let imlec;
  do {
    const s = await env.ABONELER.list({ prefix: "a:", limit: 1000, cursor: imlec });
    for (const k of s.keys) {
      const m = k.metadata || {};
      say.toplam++;
      String(m.k || "").split(",").forEach((x) => { if (say[x] !== undefined) say[x]++; });
      if (m.d === "en") say.en++; else say.tr++;
    }
    imlec = s.list_complete ? null : s.cursor;
  } while (imlec);
  const v = await env.ABONELER.get("vapid", "json");
  return cevap(req, env, { sayilar: say, anahtarVar: !!(v && v.public), anahtar: v ? v.public : "" });
}
async function kur(req, env) {
  const b = await govde(req);
  const v = await env.ABONELER.get("vapid", "json");
  if (v && !b.zorla) return cevap(req, env, { ok: true, zatenVar: true });
  await anahtarUret(env);
  return cevap(req, env, { ok: true, zatenVar: false });
}

// ---------------------------------------------------------------- yönetim sayfası (şifreyle gönderme)
const YONETIM_HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Bildirim gönder</title>
<style>
:root{color-scheme:dark;--bg:#0b1020;--y:#141b30;--c:#26304d;--t:#e8ecf8;--s:#9aa5c4;--v:#7cc4ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:16px/1.5 system-ui,sans-serif;padding:20px}
main{max-width:640px;margin:0 auto}h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:26px 0 8px}
p{color:var(--s);margin:6px 0}label{display:block;margin:14px 0 4px;font-weight:600}
input,select,textarea{width:100%;font:inherit;color:var(--t);background:var(--y);border:1px solid var(--c);border-radius:10px;padding:10px 12px}
textarea{min-height:70px;resize:vertical}button{font:inherit;font-weight:700;color:var(--bg);background:var(--v);border:0;border-radius:10px;padding:11px 18px;cursor:pointer;margin:12px 8px 0 0}
button.g{color:var(--t);background:var(--y);border:1px solid var(--c)}button:disabled{opacity:.5;cursor:default}
.kutu{background:var(--y);border:1px solid var(--c);border-radius:12px;padding:14px 16px;margin-top:14px}
.hata{color:#ff8a8a}.ok{color:#6ee7a0}[hidden]{display:none!important}code{background:#0e1527;padding:1px 6px;border-radius:6px}
</style></head><body><main>
<h1>Bildirim gönder</h1><p>Sadece sen kullan. Şifreyi kimseyle paylaşma.</p>
<div id="giris" class="kutu"><label for="sifre">Şifre</label><input id="sifre" type="password" autocomplete="current-password"><button id="girisBtn" type="button">Giriş</button><p id="girisMsg" class="hata"></p></div>
<div id="panel" hidden>
 <div class="kutu"><strong>Aboneler:</strong> <span id="sayilar">...</span><div id="kurKutu" hidden><p class="hata">Bildirim anahtarı henüz oluşturulmamış. Bir kere oluşturman yeterli.</p><button id="kurBtn" type="button">Anahtarı oluştur</button></div></div>
 <h2>Yeni bildirim</h2>
 <label for="kat">Ne için?</label><select id="kat"><option value="canli">Canlı yayın</option><option value="novel">Yeni novel bölümü</option></select>
 <label for="trb">Türkçe başlık</label><input id="trb" maxlength="80">
 <label for="trg">Türkçe metin</label><textarea id="trg" maxlength="200"></textarea>
 <label for="enb">English title</label><input id="enb" maxlength="80">
 <label for="eng">English text</label><textarea id="eng" maxlength="200"></textarea>
 <label for="url">Açılacak sayfa</label><input id="url" value="/canliyayin">
 <label for="hedef">Sadece test: tek kişiye gönder (abone kimliği; boşsa herkese)</label><input id="hedef" placeholder="örn. 3f9a... (bildirim penceresinde yazar)" autocomplete="off">
 <div><button id="gonderBtn" type="button">Gönder</button><button id="sablonBtn" class="g" type="button">Şablonu doldur</button></div>
 <p id="sonuc"></p>
</div></main>
<script>
const $=id=>document.getElementById(id);let sifre="";
const SABLON={canli:{trb:"CenkSolac canlı yayında! 🔴",trg:"Gel, birlikte oynayalım.",enb:"CenkSolac is live! 🔴",eng:"Come hang out and play with me.",url:"/canliyayin"},
novel:{trb:"Yeni bölüm yayında 📖",trg:"Novel'e yeni bir bölüm eklendi.",enb:"New chapter is out 📖",eng:"A new novel chapter has been published.",url:"/novel"}};
function api(yol,gövde,yontem){return fetch(yol,{method:yontem||"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+sifre},body:yontem==="GET"?undefined:JSON.stringify(gövde||{})}).then(async r=>({s:r.status,j:await r.json().catch(()=>({}))}))}
function sablon(){const s=SABLON[$("kat").value];["trb","trg","enb","eng","url"].forEach(k=>$(k).value=s[k])}
$("kat").onchange=sablon;$("sablonBtn").onclick=sablon;sablon();
async function yukle(){
  const r=await api("/api/durum",null,"GET");
  if(r.s!==200){$("giris").hidden=false;$("panel").hidden=true;$("girisMsg").textContent=r.s===401?"Şifre yanlış.":"Bağlanamadı.";return false}
  const n=r.j.sayilar;$("sayilar").textContent=n.toplam+" kişi (canlı yayın: "+n.canli+", novel: "+n.novel+" • TR "+n.tr+" / EN "+n.en+")";
  $("kurKutu").hidden=r.j.anahtarVar;$("giris").hidden=true;$("panel").hidden=false;return true;
}
$("girisBtn").onclick=async()=>{sifre=$("sifre").value;$("girisMsg").textContent="";await yukle()};
$("sifre").onkeydown=e=>{if(e.key==="Enter")$("girisBtn").click()};
$("kurBtn").onclick=async()=>{const r=await api("/api/kur");if(r.s===200)await yukle()};
let onay=0;
$("gonderBtn").onclick=async()=>{
  const b=$("gonderBtn");
  if(!$("trb").value.trim()){$("sonuc").className="hata";$("sonuc").textContent="Türkçe başlık boş olamaz.";return}
  if(!onay){onay=1;b.textContent="Emin misin? Göndermek için tekrar bas";setTimeout(()=>{onay=0;b.textContent="Gönder"},6000);return}
  onay=0;b.disabled=true;b.textContent="Gönderiliyor...";
  const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const g={id,kat:$("kat").value,tr:{b:$("trb").value,g:$("trg").value},en:{b:$("enb").value,g:$("eng").value},url:$("url").value,hedef:$("hedef").value.trim()};
  let top={gonderilen:0,silinen:0,basarisiz:0,bakilan:0},imlec=null,ornek="";
  try{
    for(let tur=0;tur<500;tur++){
      const r=await api("/api/gonder",Object.assign({},g,{imlec}));
      if(r.s!==200){$("sonuc").className="hata";$("sonuc").textContent="Hata: "+(r.j.hata||r.s);break}
      ["gonderilen","silinen","basarisiz","bakilan"].forEach(k=>top[k]+=r.j[k]||0);if(r.j.ornek)ornek=r.j.ornek;
      $("sonuc").className="";$("sonuc").textContent="Gönderiliyor... "+top.gonderilen+" kişiye ulaştı";
      imlec=r.j.imlec;if(!imlec){$("sonuc").className=top.basarisiz?"hata":"ok";
        $("sonuc").textContent="Bitti: "+top.gonderilen+" kişiye gönderildi"+(top.silinen?(", "+top.silinen+" geçersiz kayıt silindi"):"")+(top.basarisiz?(", "+top.basarisiz+" hata (kod "+ornek+")"):"")+".";break}
    }
  }catch(e){$("sonuc").className="hata";$("sonuc").textContent="Bağlantı koptu. Tekrar basma, önce abone sayısına bak."}
  b.disabled=false;b.textContent="Gönder";yukle();
};
</script></body></html>`;

// ---------------------------------------------------------------- yönlendirme
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(zamanli(event, env).catch(() => {}));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    const yol = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (!env.ABONELER) return new Response("KV baglantisi (ABONELER) yok", { status: 500 });
      if (req.method === "OPTIONS") {
        const o = kaynakIzni(req, env);
        const h = new Headers({ "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400", "Vary": "Origin" });
        if (o) h.set("Access-Control-Allow-Origin", o);
        return new Response(null, { status: 204, headers: h });
      }
      if (yol === "/yonetim" && req.method === "GET") {
        return new Response(YONETIM_HTML, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          },
        });
      }
      if (yol === "/api/anahtar" && req.method === "GET") {
        const v = await env.ABONELER.get("vapid", "json");
        if (!v || !v.public) return cevap(req, env, { hata: "anahtar_yok" }, 503);
        return cevap(req, env, { publicKey: v.public }, 200, { "Cache-Control": "public, max-age=3600" });
      }
      if (yol === "/api/mesajlar" && req.method === "GET") return await mesajlar(req, env);
      if (yol === "/api/abone" && req.method === "POST") return await abone(req, env);
      if (yol === "/api/sil" && req.method === "POST") return await sil(req, env);
      if (yol === "/api/gonder" || yol === "/api/durum" || yol === "/api/kur") {
        if (!(await yoneticiMi(req, env))) return cevap(req, env, { hata: "yetkisiz" }, 401);
        if (yol === "/api/gonder" && req.method === "POST") return await gonder(req, env);
        if (yol === "/api/durum" && req.method === "GET") return await durum(req, env);
        if (yol === "/api/kur" && req.method === "POST") return await kur(req, env);
      }
      if (yol === "/") return new Response("CenkSolac bildirim sunucusu", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      return cevap(req, env, { hata: "yok" }, 404);
    } catch (e) {
      return cevap(req, env, { hata: "sunucu" }, 500);
    }
  },
};
