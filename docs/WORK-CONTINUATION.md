# AI Football Live — Work Devam Listesi (17.10.2026)

Canlı: https://aifootballlive.github.io/live.html
Admin ayarları: https://aifootballlive.github.io/admin-settings.html
Admin giriş: https://aifootballlive.github.io/admin-edm2026.html
Lig: https://aifootballlive.github.io/league.html
Repo: https://github.com/aifootballlive/aifootballlive.github.io

## Bu sohbette tamamlananlar (yeniden yapma)

- TikTok "Oyun Sıralaması" etiketinin hemen altında dört takım kartı başlaması için kontrol paneli %20'den yaklaşık %7'ye yukarı alındı. Orijinal takım kalkanları, okunaklı kartlar ve aktif arena etiketi korundu. Maçın bitimine kalan süre, kartların hemen altına ve kale direğinin üzerine hedeflenerek taşındı.
- İzleyiciler için köşelerdeki Admin / LİG bağlantıları gizlendi; yalnız yetkili admin görür. İzleyiciye "Lig tablosu için profilimizdeki bağlantıyı açın" mesajı konuldu. Yalnız admine görünen MAÇI BAŞLAT butonu eklendi.
- Bağımsız admin-settings.html sayfası oluşturuldu: geniş büyük metinli ayarlar, yan yana/alt alta oyun önizlemesi, admin login yönlendirmesi. Kaydettikten sonra sayfada kalır. İkinci admin önizleme ses kaynağı kapatıldı.
- Varsayılan normal maç süresi 25 dakika, uzatma 5 dakika. Admin tarafından 1-120 dakika normal süre, 0-30 dakika uzatma, 10-600 saniye kazanan ekranı ve 10-900 saniye lig ekranı değiştirilip kalıcı Supabase ortak maç durumuna kaydedilir. Kuyruk 25. dakikada boş olsa bile maç 5 dakikalık uzatmayı tamamlar. Süre bitiminde henüz kullanılmamış şutlar yeni maçta kullanılır.
- 60 saniye kazanan/beraberlik, 120 saniye lig tablosu ve toplam 180 saniye sonra yeni maç; otomatik/manuel kontroller korunur. Arenanın adı ve dil (TR/EN) admin ayarı hâline getirildi.
- Türkçe tarayıcı TTS ses seçiminde doğal sesleri tercih eden algoritma, kazanan/beraberlik, lig, yeni maça 60 saniye ve aralıklı şut/gol/kurtarış anonsları eklendi. İngilizce anons şablonu eklendi. Bu profesyonel AI ses hizmeti değildir.
- Kamera yakınlığı ve stadyum parlaklığı kaydırıcıları hazır MP4 görüntüsünü anlık olarak etkiler, ses ayarlarının değerleri anında görünür. Video içindeki kale/top/oyuncu ayrı nesneler değildir; onların fiziksel boyutu bağımsız değiştirilemez, admin panelinde açıklaması var.
- Önceden oluşturulan özgün takımlar: Altın Pusula (sarı-lacivert), Kızıl Kıvılcım (sarı-kırmızı), Gece Yıldızı (siyah-beyaz), Bordo Dalga (bordo-mavi). Doruk Arenası aktif. Gerçek kulüp isimleri ve formaları eklenmedi.
- Admin oturumunda Supabase Auth kullanıcı ID doğrulaması var. Daha önceki sahte localStorage güvenilir cihaz işareti kaldırıldı. Ancak sunucu taraflı allowlist, MFA ve RLS denetimi tamamlanmadı.
- Kontrollü JS senaryo testleri başarılı: boş kuyrukta 25. dakikada kapanmama, 30. dakikada bitirme, toplam 180 saniye sonuç arası ve ayrı ayarlanmış 2+3 dakika ile zamanlama. Canlı TikTok/telefon görsel ve FPS testi henüz yapılmadı.

## 17.10.2026 — Sağ panel iyileştirmesi

Bu tur tamamlananlar:
- Ana live.html'den Admin Ayarları açıldığında yeni sekme yerine **aynı sayfada, sağdaki panel** açılıyor; aynı video/durum korunuyor. KAPAT ile panel kapanıp sol canlı yayın görünümüne dönülüyor.
- Admin paneli başlığında LİG TABLOSU düğmesi; tıklayınca ayrı sekme yerine aynı sağ panelde league.html görüntüleniyor, AYARLAR ile geri dönülebiliyor.
- Yönetici/YÖNETİCİ üst bağlantısı ve tekrarlı admin sayfası linki kaldırıldı. YENİLE yazısı yerine yenileme SVG ikonu konuldu; oturumsuz izleyicilere yenile/admin kontrolleri gizli kalıyor.
- İşlevsiz hazır-video ayarları (kale boyutu, top boyutu, bekleme hareketi, eski 3D sahne etiketi, sahne durum satırı, ayrı konfeti miktarı, bekleyen kutusu toggle) yönetici formundan kaldırıldı. Yakınlık ve parlaklık kontrolü tutuldu.
- ADMIN AYARLARI tipografisi yaklaşık 15–18 piksel yapıldı; form ve tuşlar iki sütuna düzenlendi. Kayıt tuşu tam genişlik, sıfırla/sonlandır yan yana, varsayılan/yeni maç yan yana, otomatik/manuel yan yana, şut durdur/oturumu kapat yan yana.
- **AKTİF MAÇI SONLANDIR** düğmesi eklendi. Yönetici onayı sonrası mevcut maç derhal bitiyor, lig sonucu kaydediliyor. Bekleyen tüm şutlar, rezerv şut ve tamamlanmamış aktif şut sonraki maç için korunuyor (gerçek zamanlı/DB ve yetkilendirme testleri hâlâ gerekli).
- Ayrı admin-settings.html adresi geriye uyumluluk için hâlâ var, ancak ana yayındaki buton artık bu adresi yeni sekmede açmıyor.
- Sözdizimi ve statik kontroller başarılı, aktif maç sonlandırma için iki kaydın olmaması ve bekleyen şutların saklanması senaryo testi geçti.

Bu turda gerçek TikTok mobil görüntü/FPS, canlı Supabase yetkisi ve failover, gerçek yönetici telefon/PC beyaz liste testleri yapılmadı.

## Work modunda kalan işler (öncelikli)

1. GERÇEK MOBİL GÖRSEL QA: Kullanıcının 17 Ekim TikTok önizlemesindeki "Oyun Sıralaması" etiketinin hemen altında kartların başladığını, sayaç kalenin üst direğini/oyuncuları kapatmadığını, Türkçe metin ve takım adlarının sığdığını gerçek 9:16 mobil ekran ve TikTok Live Studio üzerinde doğrula. Gerekirse CSS'yi son piksel ayarlarıyla düzelt.
2. KRİTİK SUNUCU GÜVENLİĞİ: Statik GitHub Pages'te admin-settings.html URL'si sadece cihazlara fiziksel olarak kapatılamaz. Supabase games.rules, teams, queue ve ilgili tüm tablo RLS/CRUD yetkileri denetlensin; yalnız gerçek admin UID yazabilsin. Gerçek PC+telefon allowlist, MFA/passkey veya Cloudflare Access, kötü niyetli giriş rate limit, token iptali, log, yedekleme, saldırı denemesi testi; kullanıcının cihazlarda kendi onayı gerekir. CSS ve tarayıcı localStorage korumasını gerçek güvenlik diye gösterme.
3. PERFORMANS: Live Studio Windows+mobilde 100+ hızlı hediye, farklı takımlar, uzun süre, çoklu admin sekmesi, 9:16 render FPS/CPU/memory ve şut devri testleri; ana yayın sekmesini bozmadan ayar sayfası açıkken tek leader ve tek audio kaynağı testleri.
4. TIKTOK HEDİYE VERİ KAYBI: Bilgisayar offline iken TikTok'un hiç teslim etmediği hediyeler yerel yedekten geri alınamaz. Bağımsız sunucu/relay, durable event log, receipt ve idempotency, kesinti sonrası güvenli replay kur; TikTok entegrasyon/anahtar erişimini güvene al.
5. GERÇEK ANLIK SAHNE AYARLARI: Mevcut MP4 videoda kale/top/futbolcu ayrı nesne olmadığından bu boyutlar anlık değiştirilemez. Video varyantı ya da WebGL/katmanlı sahne tasarımı; diğer ses/renk/konfeti/toggle kontrollerinin anlık görüntü ve kayıttan sonra davranışını test et.
6. PROFESYONEL SPİKER: Kaliteli lisanslı TR/EN AI TTS ve ses dosyası önbelleği, TikTok/Live Studio ses yönlendirmesi. Mevcut tarayıcı TTS doğal olmayabilir ve cihaz ses motoruna bağlıdır. Farklı anonsların birbirini kesmesi ve araya giren çift gol spikerini temizle.
7. ŞAMPİYONLUK FİNALİ: Tam puan, galibiyet, gol eşitliği için finalist maçlarında finalist dışı hediyeleri başka maç/sezona devret. Berabere final ve sonraki sezona kupa aktarımını uzun yük testleriyle doğrula.
8. ÇOKLU HAYALÎ LİG: Doruk Arenası aktif; diğer lig sekmeleri örnek, gerçek fikstürleri yok. Bağımsız lig kimlikleri, lig takımları, sezon arşivi ve telifsiz özgün sembol/logo tasarımı; sahte sonuç yazma.
9. SÜRE AYARI UÇTAN UCA: Tek/çok cihazda 1-120 dk normal, 0-30 dk uzatma, 10-600 sn kazanan, 10-900 sn lig ekranı, kesinti, admin manual/auto start ve hediye eklenme anı yarış koşulları test et.
10. TIKTOK PROFİLİ: Kullanıcı profil "Hakkımda" açıklamasını ve gerçek lig URL'sini kendisi eklemeli; yayın videosuna tıklanabilir web linki gömülmez. Kullanıcı özel hediyeyle web sayfası otomatik açılamaz.
11. FİKRÎ MÜLKİYET: Özgün takım ve lig adlarının marka çakışmaları kontrol edilmeli. Eski preview/dosyalar ve formalar telifli logolar içermemeli. Masaüstü oyun paketi ve App Store/Google Play seçeneği kullanıcı isteğiyle şimdilik ertelendi.

## Sonraki oturum talimatı
Önce GitHub varsayılan branch güncel dosyalarını oku; eski sürüme geri dönme. Öncelik cihaz/oturum güvenliği ve gerçek TikTok mobil yerleşimidir. Düzenlemeleri canlıya geçirmeden syntax + simülasyon + mümkünse gerçek ekran QA yap. Yapamadığın testi yapmış gibi raporlama. Her turun sonunda Work görev listesini yeniden güncelle.
