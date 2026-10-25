// Yayın saatleri Türkiye saatiyle yazılır. Ziyaretçinin saat dilimi farklıysa kendi saatini de gösterir.
(function () {
  "use strict";
  var EN = document.documentElement.lang === "en";
  function yaz(tarih, saat) {
    tarih = String(tarih || ""); saat = String(saat || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || !/^\d{1,2}:\d{2}$/.test(saat)) return "";
    var ms = Date.parse(tarih + "T" + (saat.length === 4 ? "0" + saat : saat) + ":00+03:00");
    if (!isFinite(ms)) return "";
    var d = new Date(ms);
    if (d.getTimezoneOffset() === -180) return ""; // zaten Türkiye saatindeyse göstermeye gerek yok
    try {
      var yer = EN ? "en-GB" : "tr-TR";
      var s = new Intl.DateTimeFormat(yer, { hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(d);
      var yerelGun = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      if (yerelGun !== tarih) s = new Intl.DateTimeFormat(yer, { day: "numeric", month: "long" }).format(d) + ", " + s;
      return (EN ? "Your time: " : "Senin saatinle: ") + s;
    } catch (_) { return ""; }
  }
  window.YerelSaat = { yaz: yaz };
})();
