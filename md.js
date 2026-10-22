// Yazı düzenleyicisinden gelen biçimi (kalın, italik, başlık, liste, alıntı, bağlantı, resim) güvenle gösterir.
// Günlük ve Novel sayfaları ortak kullanır: Md.render(metin) bir DOM parçası döndürür.
(function(){
"use strict";
function e(t,c,x){const n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}
function guvenliUrl(u){u=String(u||"").trim();return /^https?:\/\//i.test(u)||/^\/(?!\/)/.test(u)}
function inline(t,ata){
  const re=/\*\*(\S(?:.*?\S)?)\*\*|`([^`\n]+)`|!\[([^\]\n]*)\]\(([^)\s]+)\)|\[([^\]\n]+)\]\(([^)\s]+)\)|\*(\S(?:[^*\n]*?\S)?)\*/g;
  let son=0,m;
  while((m=re.exec(t))){
    if(m.index>son)ata.append(document.createTextNode(t.slice(son,m.index)));
    if(m[1]!==undefined){const b=e("strong");inline(m[1],b);ata.append(b)}
    else if(m[2]!==undefined)ata.append(e("code",null,m[2]));
    else if(m[4]!==undefined){
      if(guvenliUrl(m[4])){const i=e("img");i.src=m[4].trim();i.alt=m[3]||"";i.loading="lazy";ata.append(i)}
      else ata.append(document.createTextNode(m[0]));
    }else if(m[6]!==undefined){
      if(guvenliUrl(m[6])){const a=e("a");a.href=m[6].trim();a.rel="noopener noreferrer";if(/^https?:/i.test(m[6]))a.target="_blank";inline(m[5],a);ata.append(a)}
      else ata.append(document.createTextNode(m[0]));
    }else if(m[7]!==undefined){const i=e("em");inline(m[7],i);ata.append(i)}
    son=re.lastIndex;
  }
  if(son<t.length)ata.append(document.createTextNode(t.slice(son)));
}
const BLOK_DURDUR=/^(```|#{1,3}\s|\s*>|\s*([-*+]|\d+[.)])\s+|(\*|-|_)(\s*\3){2,}\s*$)/;
function md(kaynak){
  const out=document.createDocumentFragment();
  const s=String(kaynak||"").replace(/\r\n?/g,"\n").split("\n");
  let i=0;
  const bos=l=>!l.trim();
  while(i<s.length){
    const l=s[i];
    if(bos(l)){i++;continue}
    let m;
    if(/^```/.test(l)){
      const tampon=[];i++;
      while(i<s.length&&!/^```/.test(s[i])){tampon.push(s[i]);i++}
      i++;
      const pre=e("pre");pre.append(e("code",null,tampon.join("\n")));out.append(pre);continue;
    }
    if((m=l.match(/^(#{1,3})\s+(.*)$/))){
      const h=e("h"+Math.max(2,m[1].length));inline(m[2].trim(),h);out.append(h);i++;continue;
    }
    if(/^(\*|-|_)(\s*\1){2,}\s*$/.test(l.trim())){out.append(e("hr"));i++;continue}
    if(/^\s*>/.test(l)){
      const tampon=[];
      while(i<s.length&&/^\s*>/.test(s[i])){tampon.push(s[i].replace(/^\s*>\s?/,""));i++}
      const bq=e("blockquote");bq.append(md(tampon.join("\n")));out.append(bq);continue;
    }
    if(/^\s*([-*+])\s+/.test(l)||/^\s*\d+[.)]\s+/.test(l)){
      const sirali=/^\s*\d+[.)]\s+/.test(l),liste=e(sirali?"ol":"ul");
      const kural=sirali?/^\s*\d+[.)]\s+(.*)$/:/^\s*[-*+]\s+(.*)$/;
      while(i<s.length&&(m=s[i].match(kural))){const li=e("li");inline(m[1],li);liste.append(li);i++}
      out.append(liste);continue;
    }
    const tampon=[];
    while(i<s.length&&!bos(s[i])&&(tampon.length===0||!BLOK_DURDUR.test(s[i]))){tampon.push(s[i]);i++}
    const p=e("p");inline(tampon.join("\n"),p);out.append(p);
  }
  return out;
}
window.Md={render:md};
})();
