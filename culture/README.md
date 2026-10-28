# Dünya Kültür Şampiyonası

Mevcut futbol dosyalarını değiştirmeden eklenen yerel uygulama. Supabase, yeni abonelik veya ücretli sunucu kullanmaz. Node.js 24+, mevcut futbol sunucusu (8892) ve `npm ci` gerekir.

## Açılış

Windows'ta `culture/Start-Culture.ps1` çalıştırılır. Yeni sunucu yalnızca 127.0.0.1:8894 dinler. Futbolu yeniden başlatmaz.

- Yönetim: http://127.0.0.1:8894/uygulamalarim.html?app=culture
- OBS: http://127.0.0.1:8894/culture.html
- Deneme OBS: http://127.0.0.1:8894/culture.html?mode=test
- Telefon: mevcut özel Tailscale alan adında `/culture-app/uygulamalarim.html?app=culture`. Tailscale açık olmalıdır; bu adres halka açık değildir.

Önce mevcut futbol yönetici hesabına aynı alan adında giriş yapılır. MFA ve cihaz onayı aynen geçerlidir. Yeni parola oluşturulmaz. Uygulamalarım'da uygulama seçimi sabit, solda görüntü, sağda yalnızca seçilen uygulamanın yönetimi vardır. Yeni uygulamalar `apps.mjs` kayıt listesine eklenebilir; sunucu rotası ve yönetimi ayrıca uygulanmalıdır.

## Deneme ve gerçek yayın

İlk açılış DENEME modudur. Yarışmayı başlat → test kullanıcı kimliği ve `BR` yorumu → ülke seçimini test et → hediye test et. Deneme puanları, seçimleri ve geçmişi canlı veriden ayrıdır. Canlı modda elle puan yazma API'si kapalıdır.

Gerçek yayında CANLI YAYIN seçilir, TikTok kullanıcı adı girilir, Bağlan'a basılır. Oda kataloğu yüklenip “Bağlı” görülmeden entegrasyon doğrulanmış sayılmaz. Sonra yarışma başlatılır. İzleyici önce tek başına `TR`, `TUR`, `TÜRKİYE`, bayrak veya `country: us` yazar. Normal sohbet ülke seçimi sayılmaz. Hediye ancak aktif veya duraklatılmış turda seçilmiş ülkeye yazılır; ülke seçilmeden/tur başlamadan gönderilen hediye geriye dönük puana çevrilmez.

Katalogdaki hediye birim jetonu × tamamlanan seri adedi puandır. Kütüphane katalog alanına `diamond_count` dese de bu, hediye fiyatı metaverisidir; hesaba geçen Elmas veya gelir değildir. Kimliği/fiyatı doğrulanamayan olay reddedilir. Seri bitmeden puan yazılmaz; tekrar, artan seri toplamı ve yeniden bağlanma SQLite olay defterinde ayıklanır.

Beğeni puanı varsayılan kapalıdır. Açılırsa oda toplamının güvenilir artışı, seçilen eşiğe göre **20 ülkeye eşit** puan verir. Oda toplamı gelmiyorsa puan verilmez. Ortak beğeniler tek başına kazanan ülke yaratmaz.

TikTok bağlantısı mevcut ücretsiz topluluk kütüphanesini kullanır; resmî TikTok API'si değildir. TikTok protokolü, imza servisi veya erişim sınırları bağlantıyı etkileyebilir. Gerçek TikTok odasında canlı yorum + hediye alımı ayrıca doğrulanmalıdır; otomatik testler bu harici kabulü garanti etmez.

## Süre, sonuçlar ve ses

25 dakika varsayılandır. Süre ayarı sonraki turda uygulanır. Duraklat süreyi ve liderlik süresini dondurur; yeni hediyeler puana yazılır. Otomatik devam açılırsa sonuç beklemesi sonrası sonraki tur/sezon başlar. Program kapalı kaldığı saatler için sahte maç üretilmez. Puan → birikmiş liderlik süresi → önceki sıra eşitliği çözer. Geçmiş tur sonuçları yerel SQLite'ta saklanır.

20 ülke korunur. Öncelikli 10 ülkenin özgün yapay zekâ karakter görselleri tamamdır. Diğer 10 ülkede bayrak ve puanlama çalışır; portre hazırlanmadığı açıkça belirtilir. Kıyafetler ülke içindeki bir kültürel geleneği temsil eder; tüm halkın tek kıyafeti olarak sunulmaz.

Ses için yönetimde “Lider ülkenin müziği” kaydedilir; OBS/tarayıcıda bir kez SESİ BAŞLAT tıklanır. Lider değişimi yumuşak geçer. ABD ve Endonezya'da kaynakları kontrol edilmiş kamu malı kayıtlar; diğer ülkelerde özgün temalar vardır. Ayrıntı `assets/culture-v1/audio/licenses.json`; temalar **millî marş değildir**. TikTok'un gerçekçi yapay zekâ içerik etiketi, uygulama içindeki ayrı seçenekten gerektiğinde ayrıca açılmalıdır; ekrandaki etiket bunu otomatik yapmaz.

## Halka açık GitHub görüntüsü

GitHub Pages yönetim yapamaz. Yerel ekranlar WebSocket ile anlıktır. `node culture/publish.mjs --watch` yalnızca ülke puanı, sıralama, süre ve sonuçları `culture-live-data` dalındaki `culture-public.json` dosyasına yollar; kullanıcı seçimleri, kullanıcı kimlikleri, hediye olay defteri, oturum ve parolalar yayınlanmaz. Özel GitHub erişimi mevcut Git kimlik yöneticisinden alınır; koda yazılmaz. Değişiklikler 15 saniyede bir kontrol edilir, en geç 60 saniyede durum yenilenir. GitHub önbelleği ek gecikme oluşturabilir. Veri dalı her hediyede Pages derlemesi başlatmaz. Bilgisayar/yayıncı kapalıysa GitHub ekranı 90 saniye sonra son kayıt uyarısı gösterir.

Veritabanı `culture/.runtime/culture.sqlite` ve WAL dosyalarıdır; Git'e dahil edilmez. Yedek için SQLite'ın backup yöntemi veya uygulama kapalıyken bu dosyaların tamamı kullanılmalıdır. Bunları silmek canlı geçmişi ve tekrar olay korumasını kaybettirir.

## Doğrulama

`npm run culture:test`: ülke seçimi, liderlik, duraklatma, otomatik sezon, eşit beğeni, seri hediye, kalıcı tekrar koruması, yetki, CSRF, salt okunur WebSocket, özel dosya engeli.

`npm run culture:test:browser`: kurulu Chrome ile ayrı yönetici/anonim tarayıcı, ortak puan, canlı-deneme ayrımı, portre yüklemesi, 390 ve 1080 genişlikte 10 satır/footer taşması, sıralama ve uygulama sekmeleri. Harici TikTok'a sahte hediye göndermez.

Ülke erişim değerlendirmesi: [Ülkeler ve kaynaklar](COUNTRY-ACCESS.md).
