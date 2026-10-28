# Yönetici hediye bipi

AI Football → Ayarlar → Ses → **Bu cihazda hediye gelince bip çal**.

Ayar bu tarayıcıda anında saklanır; ayrıca Ayarları Uygula gerekmez. İlk açışta **Bipi dene** düğmesiyle tarayıcının sesini etkinleştir. Varsayılan kapalıdır. Açık futbol sayfası arka plandayken de yeni TikTok hediye bildirimi kısa çift bip üretir. Spiker/stadyum sesinden bağımsızdır; OBS ve anonim izleyici belgeleri bu sesi üretmez. Tarayıcı/işletim sistemi tarafından susturulmuş veya kapatılmış sayfa ses çıkaramaz.

Bildirim `tiktok-shared-v209.js` gerçek hediye alımından, şut kataloğu eşleştirmesinden bağımsız çağrılır. Şuta bağlı olmayan hediyeler de bildirilir. Tekrar gelen olay kimlikleri, aynı seri hediyenin aynı sayacı ve kapanış paketi yeniden ötmez. Aynı kökendeki yönetici sekmeleri Web Locks ve yerel makbuzlarla çift bildirimi önler. Seri sayacı arttığında yeni bildirim gelir; tek paketteki çoklu hediye bir bildirim olarak çalar.

Bu özellik hediye kabulünü, şut kuyruğunu, skoru, yayın gelirini veya genel ses ayarlarını değiştirmez. Etkinleşmesi için kullanıcı yalnız AI Football ekranını uygun zamanda yeniler. Geliştirme sırasında açık sayfa/sunucu yeniden başlatılmaz.

Doğrulama: `node tests/gift-beep-v355.cjs` ve `node tests/gift-beep-browser-v355.cjs`. Tarayıcı testi ayrı yerel fixture kullanır, gerçek yayına hediye veya şut göndermez.
