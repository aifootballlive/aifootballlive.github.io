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

20 ülke korunur. 20 ülkenin tamamının özgün yapay zekâ karakter görselleri tamamdır. Tablo ve kayan bant ülke kodlarını, bant ayrıca genel puan sırasını gösterir. Kıyafetler ülke içindeki bir kültürel geleneği temsil eder; tüm halkın tek kıyafeti olarak sunulmaz.

Ses için yönetimde “Lider ülkenin müziği” kaydedilir; OBS/tarayıcıda bir kez SESİ BAŞLAT tıklanır. Lider değişimi yumuşak geçer. Yalnızca kaynakları kontrol edilmiş sözsüz millî marşlar çalar. Özgün tema, başka şarkı veya yedek müzik çalınmaz. Doğrulanmış marşı olmayan ülke sessiz kalır. Güncel liste `assets/culture-v1/audio/licenses.json` dosyasındadır. Ses seviyesi çubuğu sürüklendikçe otomatik kaydedilir; yayın ekranındaki ses düğmesi o ekranı açıp kapatır. TikTok'un gerçekçi yapay zekâ içerik etiketi, uygulama içindeki ayrı seçenekten gerektiğinde ayrıca açılmalıdır; ekrandaki etiket bunu otomatik yapmaz.

## Halka açık GitHub görüntüsü

GitHub Pages yönetim yapamaz. Yerel ekranlar WebSocket ile anlıktır. `node culture/publish.mjs --watch` yalnızca ülke puanı, sıralama, süre ve sonuçları `culture-live-data` dalındaki `culture-public.json` dosyasına yollar; kullanıcı seçimleri, kullanıcı kimlikleri, hediye olay defteri, oturum ve parolalar yayınlanmaz. Özel GitHub erişimi mevcut Git kimlik yöneticisinden alınır; koda yazılmaz. Değişiklikler 15 saniyede bir kontrol edilir, en geç 60 saniyede durum yenilenir. GitHub önbelleği ek gecikme oluşturabilir. Veri dalı her hediyede Pages derlemesi başlatmaz. GitHub verisi iki dakikadan eskiyse güncelleme bekleniyor uyarısı gösterilir; bu tek başına bilgisayarın kapalı olduğunu kanıtlamaz. Başlatıcıya -Publish eklemek puan yayıncısını da açar.

Veritabanı `culture/.runtime/culture.sqlite` ve WAL dosyalarıdır; Git'e dahil edilmez. Yedek için SQLite'ın backup yöntemi veya uygulama kapalıyken bu dosyaların tamamı kullanılmalıdır. Bunları silmek canlı geçmişi ve tekrar olay korumasını kaybettirir.

## Doğrulama

`npm run culture:test`: ülke seçimi, liderlik, duraklatma, otomatik sezon, eşit beğeni, seri hediye, kalıcı tekrar koruması, yetki, CSRF, salt okunur WebSocket, özel dosya engeli.

`npm run culture:test:browser`: kurulu Chrome ile ayrı yönetici/anonim tarayıcı, ortak puan, canlı-deneme ayrımı, portre yüklemesi, 390 ve 1080 genişlikte 10 satır/footer taşması, sıralama ve uygulama sekmeleri. Harici TikTok'a sahte hediye göndermez.

Ülke erişim değerlendirmesi: [Ülkeler ve kaynaklar](COUNTRY-ACCESS.md).

2026-10-28: 20 ülkenin görselleri tamamlandı. 18 güncel sözsüz marş eklendi. Pakistan ve Tayland için hedef ülkelerde ticari kullanım hakkı kesinleştirilemediği için sessiz kalır. Kaynak ve gerekçeler audio/licenses.json içindedir.

Ülke kodları büyük/küçük/karışık harflerle eşleşir (Br, br, bR, BR). Seçim yine yorumun tamamıyla eşleşmelidir. video-sources/tr-fullbody-v1.png Türkiye videosunu üretmek için hazırlanmış boydan bayrak fonlu kaynak görseldir; video henüz eklenmedi.
