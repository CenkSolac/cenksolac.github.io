# Bildirim sunucusu kurulumu (Cloudflare, bir kere)

Kod: `sunucu/bildirim-sunucu.js` (tek dosya, dış paket yok). Sitede yayınlanmaz.

1. dash.cloudflare.com > Workers & Pages > Create > Create Worker. Adı: `cenksolac-bildirim`. Deploy.
2. Worker > Edit code: içindeki her şeyi sil, `bildirim-sunucu.js` dosyasının tamamını yapıştır. Deploy.
3. Storage & databases > KV > Create namespace (ad: `aboneler`).
4. Worker > Settings > Bindings > Add > KV namespace. Variable name: `ABONELER` (tam böyle, büyük harf). Namespace: `aboneler`. Deploy.
5. Worker > Settings > Variables and Secrets > Add. Type: Secret. Name: `YONETICI_SIFRE`. Value: en az 10 karakterli, sana özel şifre. Deploy.
6. Worker adresi (workers.dev) sayfanın üstünde yazar. `https://ADRES/yonetim` adresine gir, şifreyle giriş yap, "Anahtarı oluştur"a bas.
7. `veri/bildirim.json` içinde `api` alanına Worker adresini yaz, `aktif`i true yap (panelde "Bildirimler").

Bildirim göndermek: `https://ADRES/yonetim`.

## Otomatik yeni bölüm bildirimi (isteğe bağlı ek adım)

Worker > Settings > Trigger events > Add > Cron Triggers > `* * * * *` (her dakika). Worker her 10 dakikada
sitedeki `veri/novel-bolumler.json` dosyasına bakar; yeni yayınlanan bölüm varsa "novel" abonelerine bildirim gönderir.
İlk çalışmada mevcut bölümleri sessizce kaydeder (bildirim yollamaz). İleri tarihli bölümler tarihi gelince bildirilir.
Türkçe seri sadece Türkçe, İngilizce seri sadece İngilizce abonelere gider.
