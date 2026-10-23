// Bakım modu: panelde "Bakım modu" bölümünden açılır. Ziyaretçi bakım ekranını görür.
// Sahibi, gizli adresle (…/?bakim=KOD) girince siteyi normal görür. Bu bir güvenlik kilidi değil, sadece vitrin perdesidir.
(function(){
  "use strict";
  var ANAHTAR="bakim-gecis",SON="bakim-son";
  function depo(a,b){try{if(b===undefined)return localStorage.getItem(a);if(b===null)localStorage.removeItem(a);else localStorage.setItem(a,b)}catch(_){return null}}
  var perde=null;
  function gizle(){if(perde)return;perde=document.createElement("style");perde.textContent="body{visibility:hidden!important}";document.head.appendChild(perde)}
  function goster(){if(perde){perde.remove();perde=null}}
  // Daha önce bakım kapalıysa sayfayı hiç gizleme (yanıp sönme olmasın)
  if(depo(SON)!=="kapali")gizle();
  var zaman=setTimeout(goster,3000); // veri gelmezse site açılsın

  function e(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}
  var NS="http://www.w3.org/2000/svg";
  function disli(dis,r,ic,deger){ // dişli çark çizimi
    var pts=[],adim=Math.PI*2/dis;
    for(var i=0;i<dis;i++){
      var a=i*adim,k=adim/4,d=deger;
      [[a-k*1.25,ic],[a-k*0.6,r],[a+k*0.6,r],[a+k*1.25,ic]].forEach(function(p){pts.push((Math.cos(p[0])*p[1]).toFixed(1)+","+(Math.sin(p[0])*p[1]).toFixed(1))});
    }
    return pts.join(" ");
  }
  function carkSvg(){
    var s=document.createElementNS(NS,"svg");s.setAttribute("viewBox","0 0 220 170");s.setAttribute("aria-hidden","true");s.setAttribute("class","bk-svg");
    function cark(cx,cy,dis,r,ic,sinif,faz){
      var g=document.createElementNS(NS,"g");g.setAttribute("transform","translate("+cx+" "+cy+")");
      var i=document.createElementNS(NS,"g");i.setAttribute("class","bk-cark "+sinif);i.style.transform="rotate("+faz+"deg)";
      var p=document.createElementNS(NS,"polygon");p.setAttribute("points",disli(dis,r,ic));p.setAttribute("fill","#7cc4ff");
      var d=document.createElementNS(NS,"circle");d.setAttribute("r",String(ic*0.42));d.setAttribute("fill","#0b1020");
      i.appendChild(p);i.appendChild(d);g.appendChild(i);s.appendChild(g);
    }
    // iki çark birbirine geçer: büyük sağa, küçük sola döner
    cark(78,88,12,62,50,"bk-bir",-23.7);
    cark(165,50,8,44,34,"bk-iki",43.8);
    return s;
  }
  function stil(){
    var c=document.createElement("style");
    c.textContent=
      ".bk{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;background:#0b1020;color:#e8edf7;font:17px/1.6 'Outfit',system-ui,sans-serif;text-align:center}"+
      ".bk-ic{max-width:460px;width:100%}"+
      ".bk-svg{width:min(240px,70vw);height:auto;display:block;margin:0 auto 18px}"+
      ".bk-cark{transform-box:view-box;transform-origin:0 0}"+
      ".bk-bir{animation:bk-sag 12s linear infinite}.bk-iki{animation:bk-sol 8s linear infinite}"+
      "@keyframes bk-sag{to{transform:rotate(360deg)}}@keyframes bk-sol{to{transform:rotate(-360deg)}}"+
      "@media (prefers-reduced-motion:reduce){.bk-bir,.bk-iki{animation:none}}"+
      ".bk h1{font-size:clamp(34px,9vw,52px);line-height:1.1;margin:0 0 12px;font-weight:800}"+
      ".bk p{margin:0 0 12px;color:#93a1bf}"+
      ".bk .bk-donus{display:inline-block;margin:6px 0 10px;padding:6px 16px;border:1px solid #1f2a45;border-radius:999px;background:#121a2f;color:#e8edf7;font-weight:600}"+
      ".bk .bk-hesaplar{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:22px}"+
      ".bk .bk-hesaplar a{color:#7cc4ff;text-decoration:none;padding:8px 14px;border:1px solid #1f2a45;border-radius:999px;background:#121a2f;font-weight:600}"+
      ".bk .bk-hesaplar a:hover{border-color:#7cc4ff}"+
      ".bk-sahip{position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);padding:8px 8px 8px 14px;border-radius:999px;background:#f5c86b;color:#2b2106;font:600 14px/1.3 'Outfit',system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.4)}"+
      ".bk-sahip button{font:inherit;color:#2b2106;background:rgba(255,255,255,.55);border:0;border-radius:999px;padding:6px 14px;cursor:pointer}";
    document.head.appendChild(c);
  }
  function ekranGoster(d){
    stil();
    document.title="Bakım modu | CenkSolac";
    var kok=e("div","bk");kok.setAttribute("role","alert");
    var ic=e("div","bk-ic");
    ic.append(carkSvg(),e("h1",null,String(d.baslik||"").trim()||"Bakım modu"),
      e("p",null,String(d.mesaj||"").trim()||"Siteyi geliştiriyorum. Çok yakında geri döneceğim!"));
    var donus=String(d.donus||"").trim();
    if(donus)ic.append(e("span","bk-donus","Tahmini dönüş: "+donus));
    kok.append(ic);
    document.documentElement.appendChild(kok);
    document.documentElement.style.overflow="hidden";
    // Hesaplarım: bakım sırasında da ulaşılabilsin
    fetch("/veri/sosyal.json").then(function(r){return r.json()}).then(function(s){
      var l=(s.baglantilar||[]).filter(function(x){return x&&x.ad&&/^https?:\/\//i.test(String(x.url||"").trim())});
      if(!l.length)return;
      var k=e("div","bk-hesaplar");
      l.forEach(function(x){var a=e("a",null,x.ad);a.href=x.url.trim();a.target="_blank";a.rel="noopener noreferrer";k.append(a)});
      ic.append(k);
    }).catch(function(){});
  }
  function sahipCubugu(){
    stil();
    var b=e("div","bk-sahip");b.setAttribute("role","status");
    b.append(e("span",null,"Bakım modu açık. Ziyaretçiler bakım ekranını görüyor, sen siteyi görüyorsun."));
    var k=e("button",null,"Çık");k.type="button";k.setAttribute("aria-label","Sahip girişinden çık");
    k.onclick=function(){depo(ANAHTAR,null);location.replace(location.pathname+location.hash)};
    b.append(k);
    document.documentElement.appendChild(b);
  }

  fetch("/veri/bakim.json",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){
    clearTimeout(zaman);
    var aktif=!!d&&d.aktif===true,kod=String(d&&d.kod||"").trim();
    depo(SON,aktif?"acik":"kapali");
    if(!aktif){goster();return}
    // Gizli giriş adresi: ?bakim=KOD  (kod doğruysa tarayıcı hatırlar, adres temizlenir)
    try{
      var u=new URL(location.href),gelen=u.searchParams.get("bakim");
      if(gelen!==null){
        if(kod&&gelen===kod)depo(ANAHTAR,kod);
        u.searchParams.delete("bakim");history.replaceState(null,"",u.pathname+u.search+u.hash);
      }
    }catch(_){}
    if(kod&&depo(ANAHTAR)===kod){goster();sahipCubugu();return}
    gizle();ekranGoster(d); // sayfa içeriği gizli kalır, bakım ekranı görünür
  }).catch(function(){clearTimeout(zaman);goster()});
})();
