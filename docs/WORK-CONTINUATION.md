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


## 18.10.2026 — Unplayed-shot accounting audit (v198 / video v196)
- Read-only live state showed a legacy round clock without manualStarted/autoStarted flags and an older finished cue without a video ACK. No production state was modified during the audit; cannot reconstruct historical spent gifts from that row.
- Found and fixed an actual deadline/stop bug: closeRound used elapsed outcome time even without an observed video start. It now requires a valid same-round video proof before settling outcome; unplayed active/reserved shots carry without score or keeper changes.
- Unified canonical pending counts for UI/status. Reserved current/next cues remain counted until valid playback progress acknowledgement; stale proof from an earlier round cannot spend a current shot. Current and next cues both accept a matching visible-frame ACK, avoiding a delay at promotion.
- ACK checks match clock, cue id/start, actual >=80ms playback and current running phase. Renderer refuses to start before kickoff and stops stale playback outside running. Starting/cancelling kickoff returns unplayed stale reservations. Missing shared engine fails closed instead of using the old local shot-preview consumer.
- Shortened team confirmation: Şutlar maç başlayınca otomatik başlayacaktır. Three seconds, under correct card; per-team persisted notice ids handle coalesced updates with multiple recipient teams.
- New shot-accounting-v198 controlled tests: legacy/manual/countdown keep all 20 shots for 20 ticks each; no keeper debit; invalid ACK rejected; one valid playback ACK spends exactly one; unseen deadline/cancel preserves active+reserved shots. Shared/countdown regressions, browser notice/geometry, cold/delayed-storage fallback and Chrome/Edge 16 native cached clip switches passed.
- Existing open admin/TikTok source pages must reload to run these fixes; old running browser code cannot be replaced by a GitHub deployment alone. Server-enforced version fencing remains outside available management access.


## 18.10.2026 — Clear admin header row (v199 layout)
- Refresh now uses a balanced two-arrow SVG. Admin controls anchor to the top of the portrait frame with >=12px clearance above team cards; equal button height retained. At narrow <=360px widths the arena text moves left to clear buttons. Controls remain admin-only.
- Also fixed a visually confirmed timer/winner overlap: results board anchors below the result countdown. Full standings use the lower result area; keeper controls hide only during results, redundant inline score/countdown text is omitted (scores remain in standings, countdown remains in HUD). No clipped standings rows.
- Chrome layout checks at 320/360/390/449/1280: control-card gap, button top/height, actual title/arena text bounds versus controls, winner below timer, all four standings rows inside results board; four independent timed notices remain valid. Screenshot inspected at 320 and 390. Current layout module broadcast-layout-v199.js; shared/video engines unchanged v198/v196.


## 18.10.2026 — Full Turkish AI commentary (v200)
- Existing generated winner/draw MP3s retained. Added eight new original generated Turkish MP3s in assets/audio/commentary-v200 (prepare, kickoff, two shot variants, two goal variants, save, league). Same generic expressive male preset as prior winners, multilingual Turkish; no impersonation. Approximately 411KB additional audio. No runtime voice API/key or per-view generation cost.
- Shot/save commentary follows decoded contact cues; goal commentary follows video goal frame. Removed the old wall-clock speech callback from shared cue timer. Goal speech can interrupt lower priority speech; ordinary comments skip while another voice is speaking. One speech source maximum; applause remains independent. Prepared speech buffers cache in memory, loading two at a time.
- Lifecycle speech: one 30-second preparation announcement, actual kickoff announcement after that countdown, existing per-team winner/draw, then league announcement after winner. No replaying old start announcement on late join. Cancelling preparation stops it.
- Added independent Admin > Ses Ayarları > Yapay zekâ konuşmaları toggle, ai_speech_enabled saved rule, runtime preview, persisted reload, defaults enabled. Turning off immediately cancels playing/loading AI speech and browser fallback without muting crowd/ball effects. Existing goal shout checkbox renamed Gol sevinç sesi; speech volume is Spiker / konuşma sesi. Main sound mute still cancels everything.
- Engines: stadium-audio-v200.js, round-finale-v200.js, scene-video-v200.js, tiktok-shared-v200.js. Existing shot accounting/countdown changes preserved. Layout still v199.
- Chrome+Edge tests: 13 generated MP3 files (8 new + 4 winners + draw) decode/start, one simultaneous voice, toggle stops/persists/reopens, other sound remains enabled, preparation->kickoff, actual A-goal decoded frames invoke kick near 1.916s and goal near 3.4s, full mute; shared/carry/countdown regressions, layout and 16 media handoffs pass. Physical LIVE Studio audio routing/speaker listening and a real phone remain unverified; autoplay requires sound permission/user activation.


## 18.10.2026 — Floating gift confirmation (layout v201)
- Per-team three-second gift notices now render above the hint/timer text. The card stacking context rises only while notices are visible; opaque notice background keeps text readable. Pointer events remain pass-through.
- Removed notice-height contribution to HUD anchoring, so opening/closing a notice no longer moves other text/countdown. Layout test verifies stable HUD position, overlay stacking, independent expiry and existing header/results geometry at 320/360/390/449/1280. Screenshot inspected. Only layout changed; match/video/audio engines remain v200.


## 18.10.2026 — Reproduced admin preview counter overwrite (v202 UI)
- Reproduced the reported pre-match disappearance with an open admin panel: after a five-shot gift, canonical jobs and state.A.queue were 5 while frontQueueA and the stale setQueueA input displayed 0. render() called previewAdminDraft(), which overwrote the live counter using the old form value. This is a confirmed display bug independent of video accounting; no production data was modified to reproduce it.
- Broadcast pending counters now always display live state, including while editing an unsaved queue draft. Admin fields that have not been edited track incoming live queue/score values, updating their edit baseline. Deliberate admin drafts stay in their own inputs; applying unrelated settings cannot reset newly arrived shots.
- Chrome regression reproduces 0->5->10->15 gifts while panel open, unrelated input, explicit queue draft, more incoming gifts, close/reopen, unrelated settings save. Every shot preserved and live counter stable. Existing v200 manual/countdown/frame-proof accounting tests remain passing. Match/video/audio engines unchanged; only inline UI fixed.

## 19.10.2026 — Full observed playback and pre-LIVE security (v204)
- Current modules: shared/video/audio/cues/finale/layout v204. Fixed URL remains live.html with no query version required. Preserve upstream v203 authenticated commands, guest-trial opt-in and rate limits.
- Pending shots include reserved active cues until the controller has observed nearly the entire original video and its natural end. Frame progress, elapsed playback, cue identity, round and current lease owner must all match. Partial playback, seeking near end, wall-clock timeout and follower acknowledgements cannot spend a shot. Late controller starts play frame zero; recovery resumes actual media position. Explicit admin resize sets the TOTAL pending count, including any unspent active cue.
- Added server-side queue integrity validator and activation SQL in ops/shot-queue-integrity.sql. Fixture-only verification in ops/verify-shot-queue-integrity.sql checks pre-match retention, reserve moves, full completion, partial rejection and explicit reset. Activate trigger only after compatible v204 frontend is deployed. No production match state is modified by these tests.
- Eight short referee whistles verified, one per actual video start. Existing frame-reviewed kick/catch/net cues retained; A-goal net contact corrected. Native audio cues are not doubled. Eight additional generated Turkish commentary MP3s add alternating gift/support, atmosphere and final-30-second announcements. AI toggle controls all speech, crowd/effects remain separate.
- Refresh circular-arrow SVG retains button size. Compact cards, gift buttons, information and timer fit above 43% of portrait frame (goal crossbar is approximately 43.8% in the unchanged source). Public pending counters hidden. Floating notices do not shift HUD anchors. Original player MP4 bytes and resolution unchanged.
- Tests: all eight original clips fully played in Chrome, pending 1->0 only at natural end; Edge normal and three-second-late controller start fully played. Three video elements retained. Chrome+Edge decoded/played all 21 commentary MP3s; AI toggles and actual contact cues pass. Mocked admin/public layouts at widths 320/360/390/449/720/1080, notices/results/header geometry, live admin queue regression, MFA UI, accounting and commentary fixtures passed. No production shot/start/reset controls clicked. Physical phone/TikTok audio routing and long real-network stress still unverified.
- Supabase management connection is now available (supersedes earlier unavailable-access notes). Eight tables have RLS, owner-only writes; legacy public definer mutation functions are revoked. Applied 24 restrictive write policies requiring AAL2 once the owner has verified an MFA factor. admin-security.html provides private user-driven QR enrollment and verification; existing admin login handles step-up. MFA remains NOT completed until the user finishes setup and verified factor status is rechecked.
- Organization is Free; leaked-password protection requires Pro or above and remains disabled. No paid upgrade authorized/performed. Only-PC-and-phone allowlist remains undeployed; MFA is not a device allowlist. See docs/SECURITY-CHECK-2026-10-19.md for exact remaining blockers. Do not describe security as fully complete.
- Publication follow-up: fixed live.html HTTP-confirmed v204. Activated preserve_unplayed_shots trigger through activate_unplayed_shot_integrity_guard migration; enabled status and fixture-only verification passed. MFA verified-factor count remains zero, leaked-password protection remains the outstanding advisor warning. Old source/admin pages must reload once.

## 19.10.2026 — Approved PC/phone browser sessions
- Synced upstream main c7e6002 before editing, preserving shared v209, video v207, audio/finale v205, update prompts, league changes and local TikTok relay. Do not restore v204 modules over newer features.
- Applied owner_approved_browser_sessions and keep_device_privilege_helpers_in_private_schema. Twenty-four additional restrictive mutation policies require an active owner AAL2 session and, after explicit activation, an approved session_id. Auth server sessions are checked so logged-out tokens cannot use administration. Public broadcast reads unchanged.
- admin-devices.html provides explicit first-PC bootstrap, phone request + eight-character comparison code, approval by an already approved browser, at most two approved sessions, revocation and 15-minute request expiry. Private tables have no direct client grants and explicit deny policies. All elevated helpers live in private; public RPC wrappers are SECURITY INVOKER. No user/browser was automatically approved.
- This binds browser Auth sessions, not immutable hardware. Logout, clearing browser storage or switching browser requires approval again; cloned authenticated browser tokens are not hardware attestation. If both approved sessions are lost, recovery requires Supabase management access. Do not claim a physical-device guarantee.
- Activation remains false with zero device registrations until the owner clicks the PC activation button. Without that action this protection is prepared, not enabled. Do not activate an unidentified browser through management SQL.
- SQL verification (transaction rolled back): AAL1 denial, first PC approval, unapproved phone denial, no self-approval, no second bootstrap, two-browser cap, phone approval, immediate revoked-session denial, wrong-owner/anonymous denial. No match/score/queue or auth credentials changed. Browser tests verify explicit confirmation/cancel, pairing, safe text rendering and real live getAuth gate failure modes. MFA UI regression passed.
- Live local connection check: TikFinity process listens only on 127.0.0.1:21213; WebSocket handshake with production Origin succeeded. This does NOT prove upstream TikTok LIVE/gift receipt or physical LIVE Studio audio. Await user LIVE username/status and real gift/sound test. Do not start a second relay on TikFinity's occupied port.
- MFA verified on server: one verified factor, owner AAL1 denied/AAL2 permitted. Leaked-password protection intentionally deferred by owner; do not keep asking to upgrade. Advisor after new schema only retains this acknowledged warning.
- Follow-up: tests/gift-recovery-v209.cjs passed against current shared v209: 1,000 gifts/3,000 shots, duplicate event IDs, failed writes, local buffer reload and unplayed-cue carry on long interruption. These are controlled fault injections, not proof of upstream TikTok delivery while collector is offline.
- GitHub Pages deployment 836eb32 succeeded; fixed live.html serves v210 security release and admin-devices.html/JS return HTTP 200. Device activation remains pending explicit owner action.

## 19.10.2026 — Fresh home-screen login entry (v211)
- Confirmed root cause: render hid guestAdminLogin unless localStorage afl.adminRecognizedBrowser.v1 was already verified. A fresh installed/home-screen app has no such marker and therefore no reachable sign-in link.
- Login link now renders by default in HTML and remains visible for every non-admin, including empty-storage standalone apps. Text is YÖNETİCİ OTURUM AÇ with a red status light. It hides after actual verified admin authorization. Existing Auth/MFA/approved-session server policies remain unchanged; link visibility grants no authority.
- Positioned link above arena title/cards and increased minimum text size to 12px. Same live.html URL, release marker v211 enables existing refresh prompt.
- tests/home-screen-entry.cjs: Chrome mobile emulation with standalone flags and empty storage at 320/390/430; visible login/red light, no title/card overlap, same-tab live->MFA->password-login navigation, no profile/admin unlock. Screenshot inspected. This is emulation, not a physical iOS/WebKit validation. Device-auth-gate and MFA enrollment regression tests also pass. Production start/shot/reset controls were not clicked.

## 19.10.2026 — Public game entry, private admin shortcut (v212)
- Owner supersedes v211 universal-login visibility: live.html must open the game for everybody; admin shortcut only in previously approved normal browser profiles, hidden in fresh/incognito-like profiles.
- Removed automatic MFA/device redirects from live getAuth. Password-only, unapproved AAL2, anonymous and failed verification sessions remain public viewers on live.html. Explicit admin login/security routes still step up and request device approval. Existing server RLS/MFA/session restrictions unchanged.
- guestAdminLogin is hidden in static HTML (no initial flash). render only shows it for signed-out profiles with new afl.approvedAdminBrowser.v1=approved presentation marker. Set this marker only from successful server device-status approval in live or admin-devices UI; remove it after confirmed unapproval/revocation. Old MFA-only browser marker is ignored. No marker grants admin privileges. Browser data clearing removes recognition; an explicit direct security/device page is needed for first enrollment. This is browser profile recognition, not hardware or private-mode fingerprint detection.
- Tests: 18 mobile cases (320/390/430, fresh-normal, empty-storage standalone, known signed-out profile, legacy marker, AAL1, unapproved AAL2). No forced navigation, hidden shortcut except known profile, no admin unlock, explicit login/MFA route reachable, no header overlap. Device-auth gate, trusted-device UI and updated MFA regression passed. No production match controls or security registrations changed.

## 19.10.2026 — Exit stale revoked-device screen (v213)
- Screenshot showed an old admin-devices tab for an explicitly revoked session. That screen hid the only return link, trapping the viewer after revocation.
- Revoked current sessions now clear the local approved-profile marker and replace navigation with fixed live.html. Other explicit enrollment/approval requests remain available; no session is automatically approved. Every device-page state also has an always-visible Ana sayfaya dön link, including signed-out, pending and error states. Versioned device script URL avoids reuse of its older cached JS.
- Browser regression verifies revoked->home navigation, marker removal and fallback link while pending; existing bootstrap/phone approval security tests, live no-redirect auth gate and 18 mobile visibility cases passed. No production security registrations/queues changed.

## 19.10.2026 — Consistent readable settings and league typography (v214)
- Shared panel-type-v214.css is scoped to adminOverlay, leagueDrawer and standalone leaguePage. Desktop copy/labels/help/security links/buttons use 22px, section headings 26px and input numbers 26px; at the owner's 67% scaling, copy is approximately 14.7 physical pixels. Mobile copy 17px, headings 21px, numbers 23px. Broadcast scoreboard/player media untouched.
- Fixed low-contrast team queue-reset buttons that inherited light browser button backgrounds behind white text. Explicit dark-blue background, white text and border; disabled state retains readable contrasting text instead of fading the entire button. Existing button behavior unchanged.
- League description, status, summary labels, links and history use the same copy scale; table body/team names use 24px desktop/20px mobile, headers 22px/18px. Preserve horizontal table scrolling instead of compressing names into unreadable text. League drawer header/buttons align with settings type; flex iframe uses remaining height.
- Tests/panel-type-v214.cjs verified real Chrome rendering at 1224 CSS pixels with 0.67 device scale (820 physical pixels, approximating 67% desktop zoom) and 390px phone; exact standard fonts, enabled/disabled contrast, drawer fit, no panel/page horizontal overflow. Settings/reset/league screenshots inspected. This models zoom scaling rather than manipulating the user's actual browser zoom. Auth gate and trusted-device UI regression passed; no production settings/reset/shot controls clicked.

## 19.10.2026 — Settings/league tabs in the same admin panel (v217)
- Synced upstream ec53e48, preserving portrait-source mode, tiktok-studio.html and update-watch-v2. Main fixed URL unchanged.
- Both drawer headers now show AYARLAR and LİG TABLOSU buttons with selected aria-pressed state and matching active styling. Removed target=_blank league links and separate-open action from admin headers. League uses the existing single iframe in the same drawer; no additional browser tab or match controller.
- Switching back to settings preserves unsaved form values. While league is shown, render no longer refills the whole form; untouched live score/queue fields still synchronize via existing baselines. Re-clicking the active tab is a no-op. Closing still releases iframe resources. Embedded league hides its standalone Maça dön link to avoid nesting another live game inside the iframe; standalone league retains that link.
- tests/admin-tabs-v217.cjs: desktop 67%-scale and phone, header fit, active state, iframe league visibility, zero popups/one browser page, unsaved normal-minutes draft preserved, incoming gift queue field updated while league open, return and close behavior. Typography regression passed. Screenshots inspected. All DB responses mocked; no production settings, shots, scores or device approvals modified.

## 19.10.2026 — Mobile-reference HUD proportions (v218)
- Owner keeps normal mobile home typography unchanged, slightly reduces mobile admin/league typography, and wants desktop at 80% and TikTok preview to resemble the phone.
- broadcast-scale-v218.css applies only via aflProportionalHud: desktop >=801px, portrait browser sources >=650px, or explicit studio mode. Normal phone home has no applied overrides. Mobile settings copy 17->15px, headings 21->19px, numbers 23->21px; mobile league copy 17->15px, table body 20->18px, titles/summary reduced proportionally. Desktop panel readability retained.
- Removed capped pixel fonts/logos on larger sources: team names, score, shot text, pending counters, arena/hints/timer and keeper text now use the exact established 390px phone ratios in container units. Sound/admin controls also scale; sound width adjusted to prevent clipping. No video reencoding, actor/uniform changes or browser zoom manipulation.
- Desktop regular player no longer caps at 449 CSS pixels; it fits a 9:16 frame to available height. Drawer preview resizing remains intact. Both regular fixed live.html and opt-in TikTok sources support 720x1280/1080x1920 without needing a new main URL.
- tests/hud-scale-v218.cjs asserts exact unchanged phone font snapshot, normalized text/frame ratios across desktop80, 720/1080 regular and studio sources, timer above 43% crossbar region, and sound text fits. Typography, same-panel tabs/draft/live-counter tests passed with reduced phone panel scale. Current screenshots inspected. These are browser mocks/size emulation; physical TikTok preview remains user verification. Home-screen entry regression passed.
- Settings tab is already first (AYARLAR | LİG TABLOSU | KAPAT), no new tab. If user still sees only league+close, it is older deployed v216; GitHub Pages was still queued for v217 while v218 was prepared. Do not claim current live version updated until HTTP verification.

## 19.10.2026 — v219 native shot audio and new announcer
- Restored original MP4 soundtracks on the visible shot deck, respecting sound enable/master/effects volume and browser autoplay fallback. Hidden/prewarming decks remain muted.
- Removed all supplemental grass/footstep cues and the grass synthesizer. Frame-reviewed kick/catch/net effects fill missing native contacts only; native-present contacts are not doubled. Existing per-visible-shot short whistle and decoded-frame timing/accounting retained.
- Replaced the prior male commentary set with 22 generated Turkish expressive voice clips (Runway, Eleven v3, preset Mark); two extended goal calls, support/atmosphere, final 30 seconds, kickoff, league and winners. Local MP3 files avoid runtime voice service dependency; provenance/script manifest included. AI speech toggle remains active. Subjective voice preference and physical TikTok audio routing require user listening.
- Publishing remains subject to the GitHub Actions/Pages incident; do not claim release live before HTTP marker verification.
- Verification: Chrome and Edge decoded/played all 22 new MP3s with one speech source at a time; both browsers played all eight full shot clips and verified one whistle per shot, native soundtrack unmuted, missing-only contact dispatch within 200ms of reviewed cue, no step cues/grass buffers, and master mute. The 18 home-screen/auth entry regression cases passed. No production shots, scores or queues changed during QA.

## 20.10.2026 — v226 admin control position
- Refresh and Admin Settings now anchor immediately above the team cards with a 1.2% frame-width gap (minimum 3px), instead of being pinned at the frame top. Existing button size retained; right edge aligned within the frame.
- Built on upstream v225, preserving all v220-v225 readability and admin changes. Six mocked browser layouts passed: mobile, desktop at 80% scale, native 720/1080 portrait, regular 720/1080 portrait; no arena/control overlap and correct gap. Desktop screenshot visually inspected. Production match/queues untouched.

## 20.10.2026 — v227 clean initial paint
- Refresh previously painted the provisional signed-out HUD before initial state/auth and the stadium video arrived. Added an inline startup presentation gate: neutral loading status until initial boot and video data/error settle, then reveal after two animation frames so layout can finish. No cached role grants access.
- Six-second fallback releases the page if scripts, video, or auth fail; page cannot remain indefinitely hidden. Only initial presentation changes; match state, video accounting and backend permissions untouched.
- Slow approved-auth browser tests passed at 390/1280, without provisional login flash; failed-dependency timeout passed. All 18 existing mobile/auth entry regression scenarios passed.

## 20.10.2026 — v228 soft control corners
- Unified rounded corners for Refresh, Admin Settings, Sound, Start/Stop and shot buttons (8–18px relative to broadcast frame). Positions and dimensions preserved. Existing six-viewport placement checks passed; desktop rendering visually inspected.

## 20.10.2026 — v229 scoreboard hierarchy
- Enlarged arena/admin labels; removed MAÇ SKORLARI and the red per-team GOL badges. Added one full-width GOL SAYILARI heading above all four cards.
- Centered score digits against logo centers; tabular numerals and reserved score columns fit 999. Team names share queue-label sizing; gift shot text shares sound-button sizing. Queue labels wrap safely in their existing rows.
- Aligned admin controls, match action and sound right edges; refresh/admin stay equal height. Reserved space for the shared heading and kept the sound control above the goal area.
- Eight mocked Chrome layouts passed (320, 360, 390, desktop 80%, 720/1080 regular and broadcast sources): 999 fit, names/admin text fit, logo/score centers match, red badges absent, requested font pairs equal, button edges align, heading/header avoid overlap. Mobile/desktop screenshots inspected. Test scores only changed isolated browser DOM; no production state writes.

## 20.10.2026 — v230 live broadcast typography controls
- Added ANA EKRAN YAZI BOYUTLARI at the top of settings: overall plus seven independent groups (headings, team names, score digits, shot labels, queues, timer/info, buttons), 80–130%, live local preview. Distinct from the existing admin/league font slider.
- Apply saves normalized broadcast_text in the existing shared games.rules through the authorized saveRules path. Existing backend RLS/device/MFA remains unchanged. Incoming presentation updates apply to viewers; unsaved drafts survive settings/league navigation and are reverted on close. Reset button previews default typography without resetting match state.
- Added opt-in phone split preview: visible video/HUD above, settings sheet below; close returns to the ordinary layout. Local font renderer reuses authored responsive sizes, bounded text fitting, and unchanged-text guards to avoid unnecessary redraws. Existing layout/first-frame/audio code preserved.
- Mocked Chrome tests passed on phone and desktop: instant adjustment, tab draft retention, unsaved rollback, saved payload, received shared settings, defaults, 999 fitting. Eight prior scoreboard viewports passed; phone preview inspected. No production settings or shots were mutated during testing.

## 20.10.2026 — v231 pending label
- All four queue labels now read Bekleyen / Şutlar on two explicit centered lines. Counts stay in place. Eight existing scoreboard viewport checks passed.

## 20.10.2026 — v232 gift art and caption spacing
- Enlarged gift art from 7.35cqw to 9.3cqw within a square container; preserved aspect and source pixels. Shot buttons now grow vertically to contain art plus caption.
- Added space below the image and 1.3 line height with bottom padding for Ş descenders. Eight viewport checks passed for square art, image/text separation and unclipped caption bounds; mobile rendering inspected.

## 20.10.2026 — v233 broadcast divider visibility
- Replaced fixed 2–3px gaps and 1px borders with source-relative spacing: .9cqw card gaps, .48cqw bright outer borders and .32cqw internal dividers (bounded). Increased inner spacing proportionally; dark card background improves white-line contrast.
- Eight browser sizes passed gift geometry, caption room and team-name fitting. At 1080px, measured 5px outer borders and 9.72px gaps retain ~1.7px and 3.2px when reduced to a 360px preview. Source screenshot inspected; actual TikTok encoder output still requires a live preview check.

## 20.10.2026 — v234 arena title clarity
- Removed inherited 10px blurred title shadow and the weight-1000 tightly spaced treatment. Arena title now uses white Arial bold, modest positive tracking, and a flat dark backing; no glow/filter/stroke. Font-size sliders and arena naming remain functional.
- Phone/desktop typography preview/save tests and eight divider/gift viewport cases passed. Real TikTok encoding may still soften small text; no claim of eliminating external compression.

## 20.10.2026 — v238/v239 readable heading and safe insets
- Enlarged GOL SAYILARI heading, taller/wider shared bar and source-relative white outline. Added modest positive tracking/word spacing to broadcast labels; retained the recent smaller Admin label and yellow uppercase arena title.
- Reserved interior padding around names, scores, gift art/captions and queues. Added explicit title/score grid cells and count space; kept glyphs away from borders, including Ş descenders.
- Typography fitter now measures actual reserved width/height, padding, font metrics, word/letter spacing and multi-line labels at every adjustment. Default and maximum sliders preserve safe bounds; overflowing team names keep a common fitted size. Keeper count fitting uses available sibling space rather than its intrinsic width. Presentation only; no shot/game or authorization changes.
- Eight viewport tests (320/360/390, desktop 80%, regular/source 720/1080) passed default and maximum settings with 999 score text and frame/art insets. Phone/desktop slider preview, draft rollback, saved payload, received settings, reset and score fit tests passed. Max-setting mobile preview inspected. No production setting mutation during QA.

## 20.10.2026 — v240 management type up to 300%
- Expanded management/league type slider, persisted-value validation and iframe scale validation from 170% to 300%. Existing per-browser preference retained.
- Above 170%, management form groups use one column and the title wraps, so large text is not squeezed into half-width fields. Header tab controls remain fitted for navigation.
- Phone and desktop tests passed 300% selection, CSS scale 3, one-column layout, same-panel league scale 3 and persistence after reload. Mobile large-text layout inspected.

## 20.10.2026 — v241 scalable settings/league/close labels
- Removed separate 20–21px header-button caps and the JS font shrinking loop. AYARLAR, LİG TABLOSU and KAPAT now follow the management scale, including 300% (45px).
- Header controls wrap into additional rows when necessary; text wraps safely instead of shrinking. Applied to both settings and league drawer headers.
- Phone/desktop tests verified 45px labels at 300%, no button text overflow, league propagation and persistence; existing same-page tabs/draft/queue/close regression passed. Mobile 300% header inspected.
