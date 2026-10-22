// Her sayfada: üstteki duyuru çubuğu (panelde "Duyuru çubuğu"), uygulama olarak ekleme ve çevrimdışı destek.
(function(){
  "use strict";
  function e(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}
  function depo(a,b){try{if(b===undefined)return localStorage.getItem(a);localStorage.setItem(a,b)}catch(_){return null}}
  function guvenliLink(u){u=String(u||"").trim();return(/^https?:\/\//i.test(u)||/^\/(?!\/)/.test(u))?u:""}

  // ---- Duyuru çubuğu
  fetch("/veri/duyuru.json").then(function(r){return r.json()}).then(function(d){
    var metin=String(d&&d.metin||"").trim();
    if(!d||d.aktif!==true||!metin)return;
    var bitis=String(d.bitis||"").slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(bitis)&&Date.parse(bitis+"T23:59:59+03:00")<Date.now())return;
    var link=guvenliLink(d.link),anahtar="duyuru-kapali",imza=metin+"|"+link;
    if(depo(anahtar)===imza)return;
    var bar=e("div","duyuru");bar.setAttribute("role","region");bar.setAttribute("aria-label","Duyuru");
    var ic=e("div","duyuru-ic");ic.append(e("span","duyuru-metin",metin));
    if(link){
      var a=e("a","duyuru-link",String(d.link_yazi||"").trim()||"Bak");a.href=link;
      if(/^https?:/i.test(link)){a.target="_blank";a.rel="noopener noreferrer"}
      ic.append(a);
    }
    var k=e("button","duyuru-kapat","✕");k.type="button";k.setAttribute("aria-label","Duyuruyu kapat");
    k.onclick=function(){bar.remove();depo(anahtar,imza)};
    bar.append(ic,k);
    document.body.prepend(bar);
  }).catch(function(){});

  // ---- Uygulama olarak ekleme
  var standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  if(!standalone){
    var kutu=null,ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    function kutuYap(){
      if(kutu)return kutu;
      kutu=e("div","uygulama-kutu");
      (document.querySelector("main")||document.body).append(kutu);
      return kutu;
    }
    window.addEventListener("beforeinstallprompt",function(ev){
      ev.preventDefault();
      var b=e("button","uygulama-ekle","Telefona uygulama olarak ekle");b.type="button";
      b.onclick=function(){ev.prompt();b.hidden=true};
      kutuYap().replaceChildren(b);
    });
    window.addEventListener("appinstalled",function(){if(kutu)kutu.remove()});
    if(ios){
      var b=e("button","uygulama-ekle","Telefona uygulama olarak ekle");b.type="button";
      var not=e("p","uygulama-not","Tarayıcının alt ya da üst kısmındaki Paylaş düğmesine dokun, sonra “Ana Ekrana Ekle”yi seç.");not.hidden=true;
      b.onclick=function(){not.hidden=!not.hidden};
      kutuYap().append(b,not);
    }
  }

  // ---- Çevrimdışı destek
  if("serviceWorker" in navigator&&window.isSecureContext){
    window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
  }
})();
