# Yayın akışı v172 — geçiş ve işletim notları

## Uygulanan davranış

- Canlı ve lig metinleri: Sarı-Lacivert, Sarı-Kırmızı, Siyah-Beyaz, Bordo-Mavi; jenerik forma şekilleri. Eski önizleme dosyaları canlı giriş noktasına bağlı değildir. Mevcut video örnek karelerinde kulüp arması görünmedi; bu bir hukuki hak temizliği garantisi değildir.
- 25 dakika ve kuyruk boşalana kadar üst sınırı olmayan uzatma. Kuyruk boşaldıktan sonra 1,2 saniye sessizlik kontrolü korunur.
- 60 saniye kazanan, 120 saniye lig; toplam 180 saniyeden önce yeni maç başlamaz. Ara sırasında gelen hediyeler aynı kalıcı jobs kuyruğunda tutulur.
- Admin şut oynatmayı durdurduğunda aktif şut tamamlanır. Süresi dolan maç bekleyen şutları silmeden sonlanır; bu şutlar sonraki maçın kuyruğunda kalır. Duraklatma ayarı admin açana kadar devam eder.
- Otomatik devam kapalıysa veya admin başlatsın açıksa üç dakika sonunda yönetici beklenir. Admin başlatma önceliklidir. Yenileme ayarları sıfırlamaz.
- Renkli konfeti ve Web Audio ile üretilen alkış (kayıtlı müzik kullanılmaz). Türkçe tarayıcı TTS; sistemde Türkçe ses, kullanıcı etkileşimi ve ses izni gerekir. OBS/Live Studio ses yakalaması ayrıca kontrol edilmelidir. 60 saniye kala anons otomatik başlama gerçekten açıksa çalar; yönetici sonradan ayarı değiştirirse anons zamanı değişebilir.
- Büyükler mevcut gerçek tabloyu gösterir; Küçükler, Köyler, Ülkeler, Kıtalar ve Dünya boş plan kayıtlarıdır. Kullanıcı seçebilir; sahte puan ve takım üretilmez. Mevcut takım kimlikleri A–D olarak korunur.
- Maç durumu yedeği yalnızca doğrulanmış yöneticiye indirilebilir JSON olarak sunulur.

## Şampiyonluk finali: plan ve uygulama sınırı

Puan, galibiyet ve gol sıralaması birlikte değerlendirilir. Tam eşitlikte `league.finalRequired={teams,status:'planned',format:'25-minute-replay-until-unique-winner'}` kaydedilir; kupa verilmez, arşive rastgele şampiyon yazılmaz, yeni sezon başlamaz. Final oynatma bu değişiklikte etkin değildir. Final gerektiren sezon yönetici bekler; bu nedenle PR taslaktır.

Sonraki uygulamanın kesin kuralları:

1. Yalnızca eşit liderler finale katılır; iki veya daha çok katılımcı desteklenir. Final, sezon puan tablosunu ikinci kez değiştirmez.
2. `clock.kind='championship-final'` ve sabit `participants` kaydedilir. 25 dakika ve aynı kuyruk boşaltma uzatması kullanılır.
3. Katılmayan takımların mevcut ve yeni şutları ayrı `deferredJobs` kuyruğuna, kaynak işlem kimlikleri korunarak alınır; final sırasında tüketilmez. İzleyiciye sonraki sezon için beklediği gösterilir.
4. Final skorunda tek lider kupayı bir kez alır. Eşitlikte yalnızca eşit finalistler arasında tekrar finali yapılır; kura yoktur. Kesilen final iptal edilir, bekleyen şutlar korunarak yeniden oynatılır.
5. Kupa verme, arşiv ve sezon açma revision karşılaştırmalı tek işlemde ve final kimliğiyle idempotent yapılır. Ertelenmiş şutlar yeni sezona yalnızca bir kez taşınır.
6. Bu adımlar için çoklu finalist, tekrar finali, kesinti, çift yönetici ve aktarım testleri geçmeden final motoru etkinleştirilmez.

## Durum koruma ve yayın öncesi geçiş

İncelenen taban commit: `a1aaeee`. Canlı `live.html` ve `league.html` indirilerek bu committeki dosyalarla byte düzeyinde eşleştiği kontrol edildi. Üretim veritabanına bu çalışma sırasında yazılmadı.

1. Yayını durdurun; eski yönetici sekmelerinin tamamını kapatın. Eski ve yeni istemci aynı lease protokolünü kullanıyor: birlikte çalıştırmayın.
2. Yetkili Supabase oturumundan ilgili games satırının **tüm rules JSON'unu** ve revision değerini dışa aktarın; ayrıca yayın tarayıcısındaki `aiFootballPendingTikTokGifts.v1` yerel kuyruğunu yedekleyin. Şema migration SQL'i gerekmiyor.
3. Taslak PR'deki final planı sınırını değerlendirin. Ana dala merge Pages üzerinden canlı yayınlama anlamına gelebilir; yalnızca yedek alındıktan ve önizleme kontrolünden sonra merge edin.
4. Politika migration'ı mevcut v2 nesnesine yalnızca `policyVersion` ve `controls` varsayılanlarını ekler. Skor, jobs, cue, nextCue, receipts, keeper, lig ve bilinmeyen alanları korur; revision/CAS ve yönetici lease kontrolü devam eder.
5. Aynı sunucu otoritesi, aynı tarayıcı ve aynı origin kullanın. Tüm izleyicileri yenileyin. Sürenin/score/jobs toplamlarının yedekle eşleştiğini ve üç dakikalık arayı sahte hediyelerle kontrol edin. Maçı sıfırlamayın.
6. Hata halinde önce şut işlemeyi durdurun, **güncel** rules ve yerel inbox'u yeniden yedekleyin, sonra kodu geri alın. Eski rules yedeğini körlemesine yüklemek yeni hediyeleri siler. Revision artışı ve işlem kimliği karşılaştırmasıyla birleştirme gerekir.

## Kalıcılık ve güvenlik sınırları

Sunucunun kabul ettiği şutlar Supabase rules/jobs içinde tutulur. Yönetici sayfasını yenilemek bu kaydı sıfırlamaz. TikFinity'den alınmış ama henüz sunucuya yazılmamış hediyeler localStorage'a hemen yazılır; önceki 250 ms gecikme ve 2500 kayıt kesimi kaldırılmıştır. localStorage kota, gizli mod, tarayıcı temizleme ve disk arızasına karşı garanti değildir.

**Yayın bilgisayarı veya TikFinity kapalıyken hiç alınmayan hediyeler için geri getirme garantisi yoktur.** TikFinity/TikTok geçmiş olay tekrarını garanti eden bir sunucu sözleşmesi bu projede bulunmuyor. Sürekli açık ayrı alıcı servis + kalıcı olay günlüğü + olay kimliğiyle tekrar işleme gerekir. Mevcut 4000 işlem makbuzu sınırından daha eski tekrarlar mükerrer sayılabilir; tarayıcıdaki ücretsiz test şutu istekleri 10 dakika sonra sona erer ve hediye değildir.

20 saniyeyi aşan tespit edilmiş köprü kesintisi veya yönetici lease boşluğu maçı teknik nedenle bitirir; puan vermez, henüz işlenmemiş şutları korur. Hiç yönetici bağlı değilken tarayıcı kodu çalışmaz; bitiş dönüşte tespit edilir. İzleyicinin kendi bağlantısının kesilmesi maçı bitirmez.

Statik GitHub Pages hediyenin gerçek olduğunu tek başına doğrulayamaz. Supabase RLS, yönetici UID yetkileri ve herkese açık test şutu yayın kanalı ayrı sunucu güvenlik denetimi gerektirir. Masaüstü paketleme bunları veya takılmaları kendiliğinden çözmez.

## Dağıtım ve paylaşım

- Lig: https://aifootballlive.github.io/league.html — profil web sitesi alanı hesabında mevcutsa oraya ekle; yayın üstüne kısa adres/QR koy. Yayın görüntüsündeki düğme TikTok izleyicisinin tıklayabildiği bir web düğmesi değildir. Lig sayfasında bağlantıyı kopyalama düğmesi bulunur.
- Admin: https://aifootballlive.github.io/admin-edm2026.html — giriş sonrası oyun içindeki ADMIN AYARLARI. URL gizliliği yetkilendirme yerine geçmez.
- Yalnızca hediye gönderen izleyicinin TikTok ekranında otomatik sayfa açan doğrulanmış API bulunmadığından bu özellik eklenmedi.
- İlk masaüstü adımı yerel varlıklar ve yerel HTTP sunucusuyla OBS/Live Studio pencere yakalama; sonra güncel Electron veya Tauri, imzalı güncelleme ve ayrı kalıcı alıcı servis. Electron için Node integration kapalı, context isolation ve sandbox açık, gezinme/izinler kısıtlı olmalı: https://www.electronjs.org/docs/latest/tutorial/security/
- Mobil için oyun mantığını yayın/TikTok adaptöründen ayırıp Capacitor ile iOS/Android istemcisi: https://capacitorjs.com/docs . Ücretli şutlarda sunucuda satın alma doğrulama ve genellikle mağaza içi ödeme gerekir; bölgesel istisnalar ayrıca değerlendirilir: https://developer.apple.com/app-store/review/guidelines/ ve https://support.google.com/googleplay/android-developer/answer/9858738?hl=en . Bu PR kurulum paketi veya mobil mağaza sürümü içermez.
- İncelenen resmi TikTok LIVE yardımında herkes için geçerli kesin bir azami yayın süresi doğrulanamadı; sınırsız yayın garantisi verilmez. Bölge/hesap uygunluğu ve platform kesintileri oyunun zamanlayıcısından bağımsızdır. LIVE ve hediye özellikleri her yerde mevcut değildir; yayıncı için 18 yaş şartı bulunur: https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/what-is-tiktok-live . Yayın öncesi hesaptaki Live Studio uyarılarını kontrol edin; oyun kendi başına TikTok yayınını açıp kapatmaz.

## Doğrulama

`node --test --test-isolation=none football/tests/*.test.mjs`: 19 test geçti (12 mevcut, 7 yayın politikası). Standart npm test bu Windows sandbox'ında alt süreç izni nedeniyle EPERM verdi; aynı testler süreç izolasyonu kapalı çalıştırıldı.

Yerel Edge testinde dış servisler engellenip Supabase sahte veriyle değiştirildi: canlı sayfada JavaScript hatası yok, lig iframe'i görünüyor, boş Dünya seçimi gerçek tabloyu gizliyor. 9 aktif videonun birer örnek karesi incelendi. Bu kontroller gerçek TikTok hediyesi, üretim RLS, sesin yayın cihazında yakalanması veya uzun süreli performans testinin yerine geçmez.
