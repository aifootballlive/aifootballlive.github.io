# AI Football Live — Work modunda kalan işler

## Mevcut durum (2026-10-17)
Canlı giriş: https://aifootballlive.github.io/live.html
Lig: https://aifootballlive.github.io/league.html
Admin: https://aifootballlive.github.io/admin-edm2026.html
Repo: aifootballlive/aifootballlive.github.io

Uygulanan: TikTok üst bilgi alanı için HUD kaydırma; 4 özgün renkli takım logosu ve isimleri (Altın Pusula, Kızıl Kıvılcım, Gece Yıldızı, Bordo Dalga); geniş maç sayacı alt bölgede; 25+5 dakika sert bitiş; tamamlanmayan şutların sonraki tura korunması; 60 sn kazanan + 120 sn lig/geri sayım; sonuç arası alınan hediyeler sonraki tura; otomatik yeni maç, manuel başlat ve otomatik durdurma ayrı kontrol; 20 maçlık sezon ve tam puan/galibiyet/gol eşitliğinde final; basit özgün konfeti, sentetik alkış ve Türkçe tarayıcı TTS; lig tablosunda yeni takım adları, SVG logolar ve planlanan liglerin açılmamış seçicileri; admin girişinde Auth sunucu doğrulaması.

## Öncelikli kalan işler
1. **Gerçek güvenlik (KRİTİK):** GitHub Pages statik site, admin.html URL erişimini kendi başına cihazla sınırlayamaz. Supabase'de games ve diğer maç tabloları dahil tüm INSERT/UPDATE/DELETE için RLS'yi doğrula; yalnız admin UID server-side yazabilsin. Supabase Auth TOTP MFA veya WebAuthn/Passkey cihaz kaydını güvenli bir backend/edge ile yapılandır; kullanıcı PC ve telefonunu güvenilir cihaz olarak bizzat kaydetsin. Giriş denemesi rate limit, CAPTCHA gerekirse, oturum iptali, loglama, webhook imza doğrulama, yedekler, temel güvenlik taraması. İstemci localStorage güvenilir cihaz bayrağı güvenlik değildir. Admin sayfasının GET erişimi bile engellenecekse Cloudflare Access/ayrı origin gerekir, doğrudan statik Github Pages ile mümkün değil.
2. **Canlı cihaz testi (KRİTİK):** TikTok Live Studio Windows yayın penceresi ve mobil 9:16 ekranda mevcut CSS'nin gerçekten çakışmadığını; logo/isim yazıları, üst TikTok katmanı, kale çizgisi ve alttaki süreyi görsel olarak doğrula. Ekibin istediği son yerleşime göre piksel düzeltmeleri. 100+ hızlı hediye/çok takımlı sıra videosu FPS, uzun süre, belleği ve ağ bağlantısı testleri.
3. **Gerçek TikTok hediyeleri:** Bilgisayar çevrimdışı olduğunda TikTok'tan hiç alınmamış olaylar geri getirilemeyebilir; bağımsız sunucu/relay, idempotency ve kalıcı webhook/olay günlüğü kur. Kesinti sonrası çift sayımı önle, duran maçın şutları sonraki maça devrini uçtan uca test et.
4. **Şampiyonluk finali:** Genel maçta diğer iki takımın hediyelerinin nasıl ele alınacağını belirle; finalist olmayan takımların şutlarını sonraki sezona koruyarak özel final ekranı, yalnız finalist maç sonucu, tekrarlanan berabere finaller için test. Şu an finalistler arasından kupa kazananı seçiliyor ama aynı final sırasında diğer takımların atışları tamamen ayrıştırılmadı.
5. **Profesyonel Türkçe AI spiker:** Şu an sadece mevcut yayın cihazı tarayıcısında speechSynthesis; AI TTS kalitesi ve cihaz/ses yakalama garantisi yok. Lisanslı/ücretli TTS sağlayıcısı ve güvenli backend, önceden hazırlanmış ses dosyaları, OBS/Live Studio ses rotası ve ses seviyesi testi.
6. **Liglerin genişletilmesi:** Şu anda tek aktif Doruk Arenası var; Kıvılcım Arenası, Mahalle Rüzgârı, Ufuklar Kupası, Kıtalar Rotası, Dünya Kubbesi sadece navigasyon önizlemesi, bağımsız fikstür/puan yok. Her lig için bağımsız ID, ekip ataması, zamanlama, kupa ve telifsiz özgün logo; izleyici tıklayınca farklı gerçek lig verileri.
7. **Telif/marka:** Özgün oluşturulan yeni isimlerin çakışmadığına ilişkin marka araştırması henüz yapılmadı. Gerçek kulüp adları ve armaları ekleme. Eski kullanılmayan preview ve assets dosyalarını gerçek marka/logolar açısından ayrıca tara. Oyuncu görüntüleri/futbol formalarının markalarla ilişkisi varsa ayrıca kontrol et.
8. **Ses ve güvenlik:** Maç sonu konfeti/alkış ve Türkçe TTS her tarayıcıda eşit çalışmayabilir. Performans, kullanıcı onayı, otomatik oynatma politikaları ve mikrofon/ses kaynaklarıyla doğrula.

## Kurallar
- Kullanıcının seçtiği 4 takım ve mevcut futbolcu görsellerinin saçını, yüzünü, forma renklerini değiştirme.
- Seçili yeni isimler: Altın Pusula (sarı-lacivert), Kızıl Kıvılcım (sarı-kırmızı), Gece Yıldızı (siyah-beyaz), Bordo Dalga (bordo-mavi). Kulüp işaretlerini kullanma.
- 25 dakika normal + en fazla 5 dakika uzatma; tüm kalan şutları sonraki maça kayıpsız koru.
- 60 saniye kazanan + 120 saniye canlı lig tablosu, sonra otomatik devam (admin seçenekleri izin veriyorsa).
- Admin giriş ekranı erişimini cihaz seviyesinde **asla** sırf istemci kontrollerine güvenerek tamamlandı olarak işaretleme.
- Mevcut GitHub branch'te en son dosyaları FETCH etmeden eski sürüm dosyalarını değiştirme; çalışma dosya isimleri versiyonlu.
