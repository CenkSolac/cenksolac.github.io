// Sosyal medya bağlantıları: veri/sosyal.json dosyasından gelir (panelde "Sosyal medya").
(function(){
  function e(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}
  function guvenli(u){return /^https?:\/\//i.test(String(u||"").trim())}
  fetch("/veri/sosyal.json").then(function(r){return r.json()}).then(function(d){
    var l=(d.baglantilar||[]).filter(function(x){return x&&x.ad&&guvenli(x.url)});
    if(!l.length)return;
    // Google'a hesapların adresini bildiren gizli bilgi de panelden gelen listeyle güncel kalsın
    var ld=document.querySelector('script[type="application/ld+json"]');
    if(ld){try{var o=JSON.parse(ld.textContent);if(o&&o.sameAs){o.sameAs=l.map(function(x){return x.url.trim()});ld.textContent=JSON.stringify(o)}}catch(_){}}
    function yap(sinif){
      var kutu=e("div",sinif);
      l.forEach(function(x){
        var a=e("a",null,x.ad);a.href=x.url.trim();a.target="_blank";a.rel="me noopener noreferrer";kutu.append(a);
      });
      return kutu;
    }
    var ana=document.getElementById("sosyal");
    if(ana){
      ana.replaceChildren(e("h2",null,"Beni takip et"),yap("sosyal-dugmeler"));
    }else{
      var f=e("footer","altbilgi");
      f.append(e("span","soluk","CenkSolac"),yap("sosyal-satir"));
      document.body.append(f);
    }
  }).catch(function(){});
})();
