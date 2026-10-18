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


## 17.10.2026 — Chat modunda ek iyileştirme (Work'e taşınacak tamamlanmış kod)
- Eski `admin-settings.html` artık ayrı bir oyun yüklemez; `live.html#admin` sayfasına yönlendirir. Ana sayfa yetkili adminse aynı sayfada paneli açar, değilse Supabase admin girişine yönlendirir. Böylece eskiden ikinci video/leader instance yaratan adres korunup hafifletildi.
- Ana yönetim panelinde skor, bekleyen şut ve arena adı yerel önizlemeye anında yansır; normal/uzatma/kazanan/lig süreleri değişirken admin önizleme özeti güncellenir. Her karakter girişinde DB yazılmaz; AYARLARI UYGULA kalıcı kayıttır.
- Ses ayarı toggles anlık denenir, panel kapatılırsa kaydedilmemiş genel sunum ayarları son kayıtlı duruma döner. Kaydedilen ana ses açık/kapalı ayarı artık sayfa yenilemede zorla true yapılmaz.
- Lig iframesi panel kapatılırken veya ayarlara geri dönülürken boşaltılır; gizli arka plan güncellemesi azalır.
- Güncel dosyalar: live.html, tiktok-shared-v179.js; admin-settings.html yalnız legacy redirect. Kontrollü JS önizleme ve sözdizimi testleri başarılı; gerçek Live Studio/tel cihaz performansı doğrulanmadı.


## 18.10.2026 — Work verification and fixes (v193)

Built on remote 59a1d72; do not reapply older v172/v179 experiments from other local directories.

Completed in this Work pass:
- Found a separate cause of the giant black area: `leagueProfileHint` had both top and bottom constraints, stretching to 350–430px in the mobile admin view. Its bottom/height are now reset. `broadcast-layout-v193.js` anchors hint and timer to actual card dimensions on resize. Timer width is explicitly bounded inside the portrait frame.
- The result sheet is detached from the DOM while waiting/playing and only mounted during the real result phase. Verified public/admin waiting -> running -> results -> running, including viewport resize at 390x844, 449x793, 1280x900. No phantom result sheet remains outside results.
- Original eight TikTok gift symbols extracted at source resolution from the owner's two WhatsApp screenshots replace temporary vector stand-ins. Names, coin counts and 1/5-shot mapping were already implemented upstream and preserved. Pointer affordances, queue numeral flashes and striped team colors already existed; not duplicated.
- Finalist filtering now applies to job selection, next-cue preparation and pending-video checks. Non-finalist jobs stay in the persistent list. 150 outsider shots survived the final and season transition in the controlled test; trophy carried once.
- Match deadline settles already-reached contact frames and carries unplayed active/reserved shots; no queue reset during round advance.
- Added generated Turkish winner MP3s for all four current team names, draw and 60-second cue; generated applause/cheer. Audio buffers are cached, obey saved sound settings, master/goal/crowd volume and mute. English still uses existing browser fallback. These files are real AI-generated audio; the older browser-only status is superseded for these Turkish cues.
- 1,000 gift events plus duplicate deliveries produced 3,000 shots in controlled tests, with unique per-shot indices and rotation. This is not a real TikTok purchase or delivery test.
- Chrome and Edge media checks exercise A/B and C/D decoder handoffs without idle insertion, recovery of a manually paused decoder, three video nodes, and AI audio decode/play/mute. Real LIVE Studio output routing, physical phone and long-duration CPU/FPS remain unverified.

Still blocked/pending, not completed:
- No Supabase management/database credentials are available. Server-enforced trusted PC/phone, MFA, actual live RLS audit, token revocation and attack tests are NOT active. Read-only audit SQL: `ops/supabase-security-audit.sql`. Activation and durable independent receiver design: `docs/SERVER-SECURITY-AND-RELAY.md`. The existing local desktop pairing tests do not secure the cloud broadcast database.
- No independent always-on receiver/provider is deployed. Gifts never delivered while the only upstream collector is offline cannot be reconstructed from browser storage.
- Future league tabs remain previews; separate production league data/fixtures and server isolation are still to be implemented. Do not present sample standings as actual played fixtures.
- Initial name check found existing Altın Pusula usages. See `docs/NAME-REVIEW.md`; registry clearance is not complete. Do not claim all fictional names have no trademark risk.
- MP4 objects cannot be independently resized without a new rendering approach; player video files/quality unchanged.

Current upstream behavior preserved: combined winner+league results duration (default 60 seconds), first match explicit admin start, automatic continuation opt-in. Do not restore the earlier separate 60+120-second flow unless the owner asks again.

- Additional client-path hardening in v193: anonymous/free manual-shot buttons are disabled while preserving bright gift artwork. Public Realtime broadcast commands are ignored. Signed-in manual commands use authenticated Supabase updates directly, including a non-leader admin phone. This removes the unverified broadcast-to-admin relay path but DOES NOT establish that live RLS/device policies are correct; server audit is still required.


## 18.10.2026 — Explicit 30-second kickoff (v194)

- Every explicit start and automatic next-round start schedules a shared `clock.startedAt` 30 seconds in the future. All viewers show Maç Başlıyor + 00:30..00:01. Shots cannot start or consume keeper power during this preparation period; the idle clip can keep playing.
- At that exact timestamp the configured normal-time countdown starts, followed by configured overtime. Result/league display retains its existing stamped configurable duration.
- Main button is DURDUR both during preparation and play. Cancelling preparation returns to BAŞLAT without recording a league result or losing queued gifts. Stopping play ends the round with its result and temporarily pauses the automatic chain; explicit start resumes it. Saved auto preference is retained.
- Automatic continuation runs through the current season and tied championship finals, then stops when a champion is established. The next season requires an explicit start. Non-finalist shot carry-over is preserved.
- Tests: countdown 30->1->configured time, no early shots, double start, preparation cancel, result deadline, manual/auto transitions, season end, stop/restart, unauthorized start/stop; prior 1,000-gift/final-carry regression; real Chrome main-button click start/stop and public/admin rendering. Tests use mocked database state, never click the production admin start/stop button.
- Current engine: tiktok-shared-v194.js. Existing server-access and real physical-device limitations remain listed above.


## 18.10.2026 — Bounded original-video cache and team confirmations (v197/v195)

- Based on c6c088f, preserving its observed-visible-frame acknowledgement and intact unplayed-shot recovery. Do not restore v194 accounting. Current shared engine tiktok-shared-v197.js; video scene-video-v195.js, cache shot-cache-v195.js, layout broadcast-layout-v195.js.
- Shot queue acceptance now schedules its first cue and reserves its next cue in the same authenticated CAS write, removing a second polling/write round trip. Manual tap burst batch is 25ms. No optimistic/unaccepted video playback; countdown, pause, final eligibility and hard deadline remain gates.
- Removed the eight-video metadata startup barrier. Exact original durations are embedded from local MP4 metadata; original files already have fast-start metadata. No reencoding or resolution/quality changes.
- One low-priority cache fetch at a time, eight known original MP4s (~61MB) in CacheStorage, at most three materialized Blob URLs. If persistent cache is unavailable, native playback and requested-clip-only temporary Blob fallback remain available. Decoder stays limited to idle plus two shot decks. Next deck is decoded before handoff; old stream continues until a replacement frame is ready. Progress watchdog retries/resumes/reloads or swaps to cached original; canonical end releases stalled playback.
- Results label/digits centered; Refresh/Admin settings have identical top/height at 390/449/1280. Removed duplicate result heading behind timer.
- Pre-match gift confirmation is now per-team, under that team's card, independent three-second timers. Other HUD anchors move below visible notices and return when notices expire. Manual requests show the same confirmation after DB receipt; collected gifts show immediately and synchronized lastGift team/id is persisted.
- Tests: shared-v197 (1,000 duplicate-protected gift events, 3,000 shots; final carry; exact deadline; same-write cues and no keeper debit before visible-frame ACK), countdown-v197; layout-v195 public mock/admin button geometry and four independent notices; latency-v195 cold/delayed network plus rejected CacheStorage; media-v195 Chrome/Edge native handoffs, pause recovery, 16 cached changes across all eight clips, no idle insertion between queued clips, three video elements and <=3 Blob URLs. Mocked DB only, no production scores/queues altered. Physical phone/TikTok LIVE Studio and production network latency remain unverified.
