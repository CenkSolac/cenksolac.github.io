// Dil seçimi: Türkçe / English. Tarayıcı dili Türkçe değilse site İngilizce açılır; sağ üstteki düğmeyle değiştirilir.
// Sayfaların kendi yazıları Türkçe kalır; bu dosya bilinen arayüz yazılarını İngilizceye çevirir.
(function(){
  "use strict";
  var ANAHTAR="dil";
  function depo(a,b){try{if(b===undefined)return localStorage.getItem(a);localStorage.setItem(a,b)}catch(_){return null}}
  function varsayilan(){
    var l=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"tr"]);
    for(var i=0;i<l.length;i++)if(/^tr(\b|-)/i.test(l[i]))return "tr";
    return "en";
  }
  var kayit=depo(ANAHTAR),DIL=(kayit==="tr"||kayit==="en")?kayit:varsayilan();
  document.documentElement.lang=DIL;
  window.Dil={dil:DIL};

  // ---------------------------------------------------------------- Seçici düğme
  function secici(){
    if(document.querySelector(".dil-secici"))return;
    var k=document.createElement("div");k.className="dil-secici";k.setAttribute("role","group");
    k.setAttribute("aria-label",DIL==="en"?"Language":"Dil");
    [["tr","TR","Türkçe"],["en","EN","English"]].forEach(function(x){
      var b=document.createElement("button");b.type="button";b.textContent=x[1];b.lang=x[0];
      b.setAttribute("aria-pressed",String(DIL===x[0]));b.setAttribute("aria-label",x[2]);
      b.onclick=function(){if(DIL===x[0])return;depo(ANAHTAR,x[0]);location.reload()};
      k.appendChild(b);
    });
    var ust=document.querySelector("header.ust");
    if(ust)ust.appendChild(k);else{k.className+=" sabit";document.body.appendChild(k)}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",secici);else secici();
  if(DIL==="tr")return;

  // ---------------------------------------------------------------- Çeviri sözlüğü
  var AY={"Ocak":"January","Şubat":"February","Mart":"March","Nisan":"April","Mayıs":"May","Haziran":"June","Temmuz":"July","Ağustos":"August","Eylül":"September","Ekim":"October","Kasım":"November","Aralık":"December"};
  var SOZ={
    // menü ve ortak
    "Novel":"Novel","Canlı yayın":"Live stream","Mob Pazarı":"Mob Market","Günlük":"Diary","Hakkımda":"About me",
    "Yükleniyor...":"Loading...","Ana sayfaya dön":"Back to home","Sayfa bulunamadı":"Page not found",
    "Aradığın sayfa yok ya da taşınmış olabilir.":"The page you're looking for doesn't exist or may have moved.",
    "Veri yüklenemedi. Sayfayı yenile, olmazsa biraz sonra tekrar dene.":"Couldn't load the data. Refresh the page; if that doesn't help, try again in a bit.",
    "Sayfa yüklenemedi. Yenile, olmazsa biraz sonra tekrar dene.":"Couldn't load the page. Refresh it; if that doesn't help, try again in a bit.",
    "Beni takip et":"Follow me","Hesaplarım":"My accounts","Site bağlantıları":"Site links",
    "Kapat":"Close","Ara":"Search","Dil":"Language","Durum":"Status","Sıralama":"Sort","Bugün":"Today",
    // ana sayfa
    "Canlı yayında mob gönder, novel serilerimi oku, komik yayın kliplerini izle.":"Send mobs on my live stream, read my novel series, watch funny stream clips.",
    "Yayından geliyorsan buradan başla":"Coming from the stream? Start here",
    "Yayında göndermek istediğin mobu seç, yanındaki hediyeyi ve coin fiyatını gör.":"Pick the mob you want to send on stream and see its gift and coin price.",
    "Mobları gör":"See the mobs",
    "Türkçe ve İngilizce serileri oku, bölümlerde ve serilerde ara.":"Read series in Turkish and English, and search across chapters and series.",
    "Sıradaki yayına geri sayım, komik klipler ve takipçi editleri.":"Countdown to the next stream, funny clips and follower edits.",
    "Takvim: yayın günleri, videolar ve günlük yazılarım.":"Calendar: stream days, videos and my diary entries.",
    "Öne çıkan klip":"Featured clip","Son klip":"Latest clip",
    // canlı yayın
    "Sıradaki yayına geri sayım, komik anlar ve takipçilerimin yaptığı editler.":"Countdown to the next stream, funny moments and edits made by my followers.",
    "Yayın bilgisi":"Stream info","Yeni yayın günü belli olunca burada görünecek":"The next stream day will show up here once it's set",
    "TikTok'ta takip et":"Follow on TikTok","TikTok'ta izle":"Watch on TikTok","Takvime bak":"See the calendar",
    "Şu an yayında olabilirim":"I might be live right now","Sıradaki yayın":"Next stream",
    "Yayın başlamış olabilir!":"The stream may have started!","Bugün yayındayım!":"I'm live today!",
    "Klibini gönder":"Send your clip",
    "Yayından komik bir an mı yakaladın ya da bir klip mi edit ettin? Linkini ya da videonu Discord'da paylaş. Beğendiklerimi sitede senin adınla yayınlarım.":"Caught a funny moment on stream or edited a clip? Share the link or video on Discord. I'll publish my favorites on the site under your name.",
    "Discord'da gönder":"Send on Discord",
    "Klibi göndererek sitede yayınlanmasına izin vermiş olursun. İstersen adını yazmadan paylaşırım, bana söylemen yeter.":"By sending a clip you agree to it being published on the site. If you prefer, I can post it without your name, just tell me.",
    "Klipler":"Clips","Henüz klip eklenmedi. Çok yakında!":"No clips yet. Coming very soon!","Klip ara":"Search clips","Tümü":"All",
    "Bu seçime uyan klip yok.":"No clips match this selection.","Mob filtresini kaldır":"Remove mob filter",
    "Klibi izle":"Watch the clip","Klibi aç ↗":"Open the clip ↗","▶ Klibi izle":"▶ Watch the clip","Orijinalini aç ↗":"Open the original ↗",
    "Klip oynatıcı":"Clip player","Dikey":"Vertical","Bağlantı":"Link","Edit:":"Edit by:",
    "Komik":"Funny","Yayın anı":"Stream moment","Takipçi edit":"Follower edit",
    // mob pazarı
    "Önce bölümü seç, sonra yayında göndermek istediğin mobu bul. Yanındaki hediyeyi canlı yayında gönder.":"First pick a section, then find the mob you want to send on stream. Send the gift next to it during the live stream.",
    "Uyarı":"Warning","Mob göndermeden önce yayıncıya hangi oyun modunu oynadığını sorunuz.":"Before sending a mob, ask the streamer which game mode they're playing.",
    "Nasıl çalışır?":"How it works","Mobu seç":"Pick the mob","Bölümü aç, göndermek istediğin mobu bul.":"Open a section and find the mob you want to send.",
    "Hediyeyi gönder":"Send the gift","Mobun yanındaki hediyeyi canlı yayında gönder.":"Send the gift next to the mob during the live stream.",
    "Yayında gör":"See it on stream","Mob yayında oyuna gelir.":"The mob shows up in the game on stream.",
    "Bu bölümde mob ara":"Search mobs in this section","Mob ara":"Search mobs","Ucuzdan pahalıya":"Cheapest first","Pahalıdan ucuza":"Most expensive first",
    "Tehlike:":"Danger:","Hepsi":"All","Özel event":"Special event","Yeni":"New",
    "Zararsız":"Harmless","Düşük":"Low","Orta":"Medium","Yüksek":"High","Ölümcül":"Deadly",
    "Bu bölüme yakında mob eklenecek.":"Mobs will be added to this section soon.","Aramana uyan mob yok.":"No mobs match your search.",
    "Devamını gör":"Read more","Daha az göster":"Show less",
    // novel
    "Seri veya bölüm ara":"Search series or chapters","Tüm diller":"All languages","Türkçe":"Turkish","Tüm durumlar":"All statuses",
    "Aramana uyan seri ya da bölüm yok.":"No series or chapters match your search.","← Tüm seriler":"← All series",
    "Bu seri için henüz özet yazılmadı.":"No summary has been written for this series yet.","Özetin devamını gör":"Read more","Özeti kısalt":"Show less",
    "İlk bölümden başla":"Start from the first chapter","En son bölüm":"Latest chapter","Bölümler":"Chapters",
    "Bu seriye henüz bölüm eklenmedi.":"No chapters have been added to this series yet.","Bölüm ara":"Search chapters",
    "Eskiden yeniye":"Oldest first","Yeniden eskiye":"Newest first","Aramana uyan bölüm yok.":"No chapters match your search.",
    "Son okuduğun":"Last read","← Önceki bölüm":"← Previous chapter","Sonraki bölüm →":"Next chapter →",
    "Bu bölümün metni henüz yazılmadı.":"This chapter hasn't been written yet.","Bu bölümün metni yüklenemedi. Sayfayı yenile.":"Couldn't load this chapter. Refresh the page.",
    "Yeni bölüm":"New chapter","Okuma ayarları":"Reading settings","Yazı:":"Text:","Renk:":"Color:","Koyu":"Dark","Açık":"Light","Sepya":"Sepia",
    "Yazıyı küçült":"Make text smaller","Yazıyı büyüt":"Make text larger",
    "Devam ediyor":"Ongoing","Tamamlandı":"Completed","Ara verildi":"On hiatus",
    "Fantastik":"Fantasy","Aksiyon":"Action","Macera":"Adventure","Romantik":"Romance","Gizem":"Mystery","Korku":"Horror","Bilim kurgu":"Sci-fi",
    "Komedi":"Comedy","Sistem":"System","Reenkarnasyon":"Reincarnation","Hayatta kalma":"Survival","Karanlık":"Dark","Savaş":"War","Okul":"School","Günlük yaşam":"Slice of life",
    // günlük
    "Yayın günlerim, videolarım ve notlarım burada.":"My stream days, videos and notes are here.",
    "Önceki ay":"Previous month","Sonraki ay":"Next month",
    "Pzt":"Mon","Sal":"Tue","Çar":"Wed","Per":"Thu","Cum":"Fri","Cmt":"Sat","Paz":"Sun",
    "YouTube videosu":"YouTube video","Diğer":"Other","Günlük yazısı":"Diary entry","Etkinlik":"Event",
    "Bu güne ait kayıt yok.":"Nothing on this day.","daha fazla göster":"show more","Günlük yazıları":"Diary entries","Henüz günlük yazısı yok.":"No diary entries yet.",
    "Yazılarda ara":"Search entries","Etikete göre filtrele":"Filter by tag","Tüm etiketler":"All tags","Aramana uyan yazı yok.":"No entries match your search.",
    "← Tüm günlük":"← All diary","Bu yazının metni boş.":"This entry is empty.","Yazı yüklenemedi. Sayfayı yenile.":"Couldn't load the entry. Refresh the page.",
    "← Önceki yazı":"← Previous entry","Sonraki yazı →":"Next entry →",
    "Harika":"Great","İyi":"Good","Yorgun":"Tired","Üzgün":"Sad","Sinirli":"Angry","Heyecanlı":"Excited",
    // hakkımda, bağlantılar
    "Hakkımda | CenkSolac":"About me | CenkSolac","Bağlantılar | CenkSolac":"Links | CenkSolac",
    "Canlı yayıncı · Mob Pazarı · Klipler · Novel":"Live streamer · Mob Market · Clips · Novel",
    "Yayına mob göndermek için buradan seç":"Pick here to send a mob on stream","Klipler ve yayın":"Clips and stream",
    "Sıradaki yayın, komik anlar, takipçi editleri":"Next stream, funny moments, follower edits","Serileri oku":"Read the series",
    "Yayın takvimi ve günlük yazılarım":"Stream calendar and my diary entries","Ben kimim?":"Who am I?",
    "CenkSolac | Mob Pazarı, web novel ve canlı yayın":"CenkSolac | Mob Market, web novel and live stream",
    "Merhaba, ben Cenk. TikTok'ta canlı yayın yapıyorum.":"Hi, I'm Cenk. I live stream on TikTok.",
    "Yayınlarda Minecraft oynuyorum. İzleyiciler hediye göndererek yayına mob yollayabiliyor; hangi mobun hangi hediyeyle geldiğini Mob Pazarı sayfasında görebilirsin.":"I play Minecraft on my streams. Viewers can send mobs to the stream by sending gifts; you can see which mob comes with which gift on the Mob Market page.",
    "Bu site benim köşem: yayınlardan komik klipler, takipçilerimin yaptığı editler, okuyabileceğin novel serileri ve günlüğüm burada duruyor.":"This site is my corner: funny clips from the streams, edits made by my followers, novel series you can read and my diary live here.",
    "Yayın günlerini Günlük sayfasındaki takvimden takip edebilir, klip göndermek ya da sohbet etmek için Discord'a gelebilirsin.":"You can follow stream days on the calendar in the Diary page, and come to Discord to send clips or just chat.",
    // uygulama, duyuru, bakım
    "Telefona uygulama olarak ekle":"Add to your phone as an app",
    "Tarayıcının alt ya da üst kısmındaki Paylaş düğmesine dokun, sonra “Ana Ekrana Ekle”yi seç.":"Tap the Share button at the bottom or top of your browser, then choose “Add to Home Screen”.",
    "Duyuru":"Announcement","Duyuruyu kapat":"Dismiss announcement","Bak":"Look",
    "Yeni: Klipler sayfası açıldı! Komik yayın anlarını izle.":"New: the Clips page is open! Watch the funny moments from my streams.","Klipleri gör":"See the clips",
    "Bakım modu":"Maintenance mode","Siteyi güzelleştiriyorum. Çok yakında geri döneceğim!":"I'm polishing the site. I'll be back very soon!"
  };
  function say(n,tek,cok){return n+" "+(Number(n)===1?tek:cok)}
  function ay(s){ // 22 Ekim 2026 → 22 October 2026, Ekim 2026 → October 2026
    return s.replace(/\b(\d{1,2}) (Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık) (\d{4})\b/g,function(_,g,a,y){return g+" "+AY[a]+" "+y})
            .replace(/\b(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık) (\d{4})\b/g,function(_,a,y){return AY[a]+" "+y});
  }
  function sayiBicim(s){return s.replace(/(\d{1,3}(?:\.\d{3})+)(?= coin)/g,function(x){return x.replace(/\./g,",")})}
  function k(x){var c=coz(x);return c===null?x:c}
  var KURAL=[
    [/^(\d+) bölüm$/,function(m){return say(m[1],"chapter","chapters")}],
    [/^(\d+) kayıt$/,function(m){return say(m[1],"entry","entries")}],
    [/^(\d+) gün sonra$/,function(m){return "in "+say(m[1],"day","days")}],
    [/^(\d+) gün (\d+) saat (\d+) dk$/,function(m){return m[1]+"d "+m[2]+"h "+m[3]+"m"}],
    [/^(\d+) saat (\d+) dk$/,function(m){return m[1]+"h "+m[2]+"m"}],
    [/^(\d+) dk (\d+) sn$/,function(m){return m[1]+"m "+m[2]+"s"}],
    [/^Daha fazla göster \((\d+) klip daha\)$/,function(m){return "Show more ("+m[1]+" more "+(Number(m[1])===1?"clip":"clips")+")"}],
    [/^Daha fazla göster \((\d+) yazı daha\)$/,function(m){return "Show more ("+m[1]+" more "+(Number(m[1])===1?"entry":"entries")+")"}],
    [/^▶ Klipleri izle \((\d+)\)$/,function(m){return "▶ Watch the clips ("+m[1]+")"}],
    [/^(\d+) mob, en ucuzu ([\d.,]+) coin$/,function(m){return m[1]+" mobs, cheapest "+sayiBicim(m[2]+" coin")}],
    [/^Edit: (.+)$/,function(m){return "Edit by: "+ay(m[1])}],
    [/^Tehlike: (.+)$/,function(m){return "Danger: "+k(m[1])}],
    [/^Yazar: (.+)$/,function(m){return "Author: "+m[1]}],
    [/^Kaldığın yerden devam et: (.+)$/,function(m){return "Continue where you left off: "+m[1]}],
    [/^(.+) · tüm bölümler$/,function(m){return m[1]+" · all chapters"}],
    [/^Sıradaki canlı yayın: (.+)$/,function(m){return "Next live stream: "+ay(m[1])}],
    [/^Mod: (.+)$/,function(m){return "Mode: "+m[1]}],
    [/^Tahmini dönüş: (.+)$/,function(m){return "Estimated return: "+m[1]}],
    [/^(.+) kapağı$/,function(m){return m[1]+" cover"}],
    [/^(.+) klibini oynat$/,function(m){return "Play clip: "+m[1]}],
    [/^(.+) \(yeni sekmede açılır\)$/,function(m){return m[1]+" (opens in a new tab)"}],
    [/^(.+) \| CenkSolac$/,function(m){var c=coz(m[1]);return c===null?null:c+" | CenkSolac"}],
    [/^(.+) \| (.+)$/,function(m){var a=coz(m[1]),b=coz(m[2]);return(a===null&&b===null)?null:(a===null?m[1]:a)+" | "+(b===null?m[2]:b)}]
  ];
  function coz(c){
    if(Object.prototype.hasOwnProperty.call(SOZ,c))return SOZ[c];
    for(var i=0;i<KURAL.length;i++){var m=c.match(KURAL[i][0]);if(m){var r=KURAL[i][1](m);if(r!==null)return r}}
    var ayli=ay(c).replace(" (Türkiye saati)"," (Turkey time)").replace(/\b(\d+) kayıt\b/g,function(_,n){return say(n,"entry","entries")});
    ayli=sayiBicim(ayli);
    return ayli!==c?ayli:null;
  }
  function cevir(s){
    var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/);if(!m||!m[2])return s;
    var r=coz(m[2]);return r===null?s:m[1]+r+m[3];
  }

  // ---------------------------------------------------------------- Sayfaya uygulama
  var ATIR=["placeholder","aria-label","title","alt"];
  function atla(n){
    var el=n.nodeType===1?n:n.parentElement;
    if(!el)return true;
    if(/^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/.test(el.tagName))return true;
    return !!(el.closest&&el.closest(".okuma,.dil-secici,[data-dil-yok]"));
  }
  function metin(n){
    if(atla(n))return;
    var y=cevir(n.data);if(y!==n.data)n.data=y;
  }
  function oznitelik(el){
    if(atla(el))return;
    for(var i=0;i<ATIR.length;i++){
      var v=el.getAttribute(ATIR[i]);if(v){var y=cevir(v);if(y!==v)el.setAttribute(ATIR[i],y)}
    }
  }
  function agac(kok){
    if(kok.nodeType===3){metin(kok);return}
    if(kok.nodeType!==1)return;
    oznitelik(kok);
    var w=document.createTreeWalker(kok,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,null),n;
    while((n=w.nextNode())){if(n.nodeType===3)metin(n);else oznitelik(n)}
  }
  function basla(){
    if(document.title){var t=cevir(document.title);if(t!==document.title)document.title=t}
    agac(document.documentElement);
  }
  var gozcu=new MutationObserver(function(liste){
    for(var i=0;i<liste.length;i++){
      var m=liste[i];
      if(m.type==="childList"){for(var j=0;j<m.addedNodes.length;j++)agac(m.addedNodes[j]);
        if(m.target.nodeName==="TITLE"||(m.target.parentNode&&m.target.parentNode.nodeName==="TITLE")){var t=cevir(document.title);if(t!==document.title)document.title=t}}
      else if(m.type==="characterData"){metin(m.target);if(m.target.parentNode&&m.target.parentNode.nodeName==="TITLE"){var t2=cevir(document.title);if(t2!==document.title)document.title=t2}}
      else if(m.type==="attributes")oznitelik(m.target);
    }
  });
  gozcu.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATIR});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",basla);else basla();
})();
