// Klipler: veri/klipler.json dosyasından gelir (panelde "Klipler").
// Ortak kod: ana sayfa, Canlı yayın ve Mob Pazarı sayfaları bunu kullanır.
(function(){
  "use strict";

  function e(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}
  function httpUrl(u){u=String(u||"").trim();return /^https?:\/\//i.test(u)?u:""}
  // Dosya ve resim yolları: sitenin kendi yolu (/klipler/..) ya da https adresi olabilir
  function yol(u){u=String(u||"").trim();return(/^\/(?!\/)/.test(u)||/^https:\/\//i.test(u))?u:""}
  function ytId(u){
    var m=String(u||"").match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m?m[1]:"";
  }
  function ttId(u){
    var m=String(u||"").match(/tiktok\.com\/(?:@[^\/?#]+\/video|embed\/v2)\/(\d{8,25})/);
    return m?m[1]:"";
  }
  function norm(s){return String(s||"").toLocaleLowerCase("tr").replace(/\s+/g," ").trim()}

  function kaynakBul(k){
    if(k.video)return{tur:"dosya",src:k.video};
    var y=ytId(k.link);if(y)return{tur:"youtube",id:y};
    var t=ttId(k.link);if(t)return{tur:"tiktok",id:t};
    return{tur:"dis"};
  }

  function duzenle(x){
    var tarih=String(x.tarih||"").slice(0,10);
    var k={
      id:String(x.id||"").split("/").pop().replace(/\.md$/,""),
      baslik:String(x.baslik||"").trim(),
      tarih:/^\d{4}-\d{2}-\d{2}$/.test(tarih)?tarih:"",
      link:httpUrl(x.link),
      video:yol(x.video),
      kapak:yol(x.kapak),
      etiketler:(Array.isArray(x.etiketler)?x.etiketler:[]).map(String).filter(Boolean),
      editor:String(x.editor||"").trim(),
      editorLink:httpUrl(x.editor_link),
      mob:String(x.mob||"").trim(),
      aciklama:String(x.aciklama||"").trim(),
      onecikan:x.onecikan===true,
      yon:(x.yon==="dikey"||x.yon==="yatay")?x.yon:""
    };
    k.kaynak=kaynakBul(k);
    if(!k.yon)k.yon=(k.kaynak.tur==="tiktok"||/youtube\.com\/shorts\//i.test(k.link))?"dikey":"yatay";
    return k;
  }

  var onbellek=null;
  function yukle(){
    if(!onbellek){
      onbellek=fetch("/veri/klipler.json").then(function(r){return r.json()}).then(function(a){
        return(Array.isArray(a)?a:[]).map(duzenle)
          .filter(function(k){return k.id&&k.baslik&&(k.video||k.link)})
          .sort(function(a,b){return(b.tarih+b.id).localeCompare(a.tarih+a.id)});
      }).catch(function(){return[]});
    }
    return onbellek;
  }

  function tarihYaz(t){
    if(!t)return"";
    var A=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    var p=t.split("-").map(Number);return p[2]+" "+A[p[1]-1]+" "+p[0];
  }

  // ---- Küçük resim: kapak > YouTube'un kendi resmi > videonun ilk karesi > yedek ----
  var gozlemci=null;
  function gozle(v){
    if(!("IntersectionObserver" in window)){v.src=v.dataset.src;return}
    if(!gozlemci)gozlemci=new IntersectionObserver(function(l){
      l.forEach(function(g){if(g.isIntersecting){var x=g.target;x.src=x.dataset.src;gozlemci.unobserve(x)}});
    },{rootMargin:"300px"});
    gozlemci.observe(v);
  }
  function kapakEl(k){
    var d=e("div","klip-kapak"),s=k.kaynak;
    function yedek(){
      d.classList.add("yok");
      d.replaceChildren(e("span","klip-yedek",s.tur==="youtube"?"YouTube":s.tur==="tiktok"?"TikTok":s.tur==="dosya"?"Video":"Bağlantı"));
      if(s.tur!=="dis")d.append(e("span","klip-oynat"));
    }
    var resim=k.kapak||(s.tur==="youtube"?"https://i.ytimg.com/vi/"+s.id+"/hqdefault.jpg":"");
    if(resim){
      var im=e("img");im.src=resim;im.alt="";im.loading="lazy";im.onerror=yedek;d.append(im);
    }else if(s.tur==="dosya"){
      var v=e("video");v.muted=true;v.playsInline=true;v.preload="metadata";
      v.setAttribute("aria-hidden","true");v.dataset.src=s.src+"#t=0.1";v.onerror=yedek;
      d.append(v);gozle(v);
    }else{yedek();return d}
    d.append(s.tur==="dis"?e("span","klip-dis","↗"):e("span","klip-oynat"));
    if(k.yon==="dikey")d.append(e("span","klip-rozet","Dikey"));
    return d;
  }

  // ---- Alt bilgi: editör kredisi, etiketler, mob bağlantısı ----
  function bilgi(k,tam){
    var b=e("div","klip-bilgi");
    if(k.editor){
      var p=e("p","klip-editor");p.append(document.createTextNode("Edit: "));
      if(k.editorLink){
        var a=e("a",null,k.editor);a.href=k.editorLink;a.target="_blank";a.rel="noopener noreferrer nofollow ugc";p.append(a);
      }else p.append(e("strong",null,k.editor));
      b.append(p);
    }
    var sat=e("div","klip-etiketler");
    k.etiketler.forEach(function(x){sat.append(e("span","cip",x))});
    if(k.mob){var m=e("a","cip mob-cip","Mob: "+k.mob);m.href="mobpazari?mob="+encodeURIComponent(k.mob);sat.append(m)}
    if(sat.children.length)b.append(sat);
    if(tam&&k.aciklama){var ac=e("p","klip-aciklama",k.aciklama);b.append(ac)}
    if(tam&&k.link&&k.kaynak.tur!=="dosya"){
      var o=e("a","klip-orijinal","Orijinalini aç ↗");o.href=k.link;o.target="_blank";o.rel="noopener noreferrer";b.append(o);
    }
    return b;
  }

  // ---- Oynatıcı penceresi ----
  var dlg=null;
  function pencere(){
    if(dlg)return dlg;
    dlg=e("dialog","klip-dialog");dlg.setAttribute("aria-label","Klip oynatıcı");
    dlg.addEventListener("click",function(ev){if(ev.target===dlg)dlg.close()});
    dlg.addEventListener("close",function(){
      dlg.replaceChildren(); // oynatıcıyı kaldır, ses de durur
      try{
        var u=new URL(location.href);u.searchParams.delete("k");
        history.replaceState(null,"",u.pathname+u.search+u.hash);
      }catch(_){}
    });
    document.body.append(dlg);
    return dlg;
  }
  function ac(k){
    var s=k.kaynak;
    if(s.tur==="dis"){window.open(k.link,"_blank","noopener");return}
    var d=pencere();
    if(d.open)return;
    d.replaceChildren();
    var ust=e("div","klip-dialog-ust"),kapat=e("button","dgm","Kapat");
    kapat.type="button";kapat.onclick=function(){d.close()};
    ust.append(e("strong",null,k.baslik),kapat);
    var oyn=e("div","klip-oynatici "+k.yon);
    if(s.tur==="dosya"){
      var v=e("video");v.controls=true;v.autoplay=true;v.playsInline=true;v.src=s.src;
      if(k.kapak)v.poster=k.kapak;
      oyn.append(v);
    }else{
      var f=e("iframe");
      f.src=s.tur==="youtube"
        ?"https://www.youtube-nocookie.com/embed/"+s.id+"?autoplay=1&rel=0&playsinline=1"
        :"https://www.tiktok.com/embed/v2/"+s.id;
      f.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen=true;f.referrerPolicy="strict-origin-when-cross-origin";f.title=k.baslik;
      oyn.append(f);
    }
    var alt=e("div","klip-dialog-alt");
    if(k.tarih)alt.append(e("p","klip-tarih",tarihYaz(k.tarih)));
    alt.append(bilgi(k,true));
    d.append(ust,oyn,alt);
    try{d.showModal()}catch(_){d.setAttribute("open","")}
    try{
      var u=new URL(location.href);u.searchParams.set("k",k.id);
      history.replaceState(null,"",u.pathname+u.search+u.hash);
    }catch(_){}
  }

  // ---- Klip kartı: üstte tıklanabilir küçük resim ve başlık, altta kredi ----
  function kart(k){
    var a=e("article","klip-kart");
    var tik;
    if(k.kaynak.tur==="dis"){tik=e("a","klip-ac");tik.href=k.link;tik.target="_blank";tik.rel="noopener noreferrer"}
    else{tik=e("button","klip-ac");tik.type="button";tik.onclick=function(){ac(k)}}
    tik.append(kapakEl(k),e("strong","klip-baslik",k.baslik));
    if(k.tarih)tik.append(e("span","klip-tarih",tarihYaz(k.tarih)));
    tik.setAttribute("aria-label",k.baslik+(k.kaynak.tur==="dis"?" (yeni sekmede açılır)":" klibini oynat"));
    a.append(tik,bilgi(k,false));
    return a;
  }

  window.Klip={yukle:yukle,kart:kart,kapakEl:kapakEl,ac:ac,norm:norm,tarihYaz:tarihYaz,kaynakBul:kaynakBul,httpUrl:httpUrl,yol:yol};
})();
