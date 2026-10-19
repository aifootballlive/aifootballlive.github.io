# TikTok CANLI hediye bağlantısı (bilgisayar)
Bu altyapı, **gerçek TikTok LIVE** hediyelerini `https://aifootballlive.github.io/live.html` oyunundaki takımlara yönlendirmek üzere hazırlanmıştır. Yalnızca tarayıcı test düğmelerini taklit etmez.

## Windows hızlı kurulum
1. **Node.js LTS** kurulu değilse https://nodejs.org/ adresinden kurun.
2. Proje klasörünü bilgisayara indirin veya güncel GitHub kodunu çekin.
3. `TIKTOK-BASLAT.cmd` dosyasını açın.
4. TikTok canlı yayın **kullanıcı adınızı** yazın (`@` olmadan da olur).
5. Bilgisayarınızda `https://aifootballlive.github.io/live.html` sayfasında MFA ile **yönetici oturumu açık** kalsın. Gizli sekme başka cihazda izleyici olabilir.
6. TikTok canlı yayını başlatın ve ilk hediyeleri göndererek hangi takımın kaç şut aldığını kontrol edin.

Alternatif komutlar: `npm install` ve `npm run tiktok:bridge -- --username kullaniciadi`.

## Hediye -> şut
Oyun şu sekiz isim eşlemesini kullanır:
| Takım | 1 şut | 5 şut |
|---|---|---|
| Altın Pusula (A) | Rocket / Roket | You Are My Jam |
| Kızıl Kıvılcım (B) | Love Scent / Aşk Kokusu | Donut |
| Gece Yıldızı (C) | Overreaction / Aşırı Tepki | Capybara / Kapibara |
| Bordo Dalga (D) | Name Greeting / İsimle Selamlama | You Are On A Roll |

**Önemli:** TikTok'un hediye adları bölgeye göre farklı dönebilir. Tanınmayan isimlerin eşleşmesini ilk canlı testte loglardan kontrol edip düzeltmek gerekebilir. Tekrarlı hediyeler ancak seri sona erince aktarılır. Ağ koparsa otomatik yeniden bağlanma denenir; eski hediye kimlikleri tekrar şut yazmaz.

## Nasıl çalışır?
- `football/tiktok-bridge.mjs`, Node.js üzerinde, resmi olmayan `tiktok-live-connector` kullanarak belirtilen LIVE odasını dinler.
- Köprü **yalnızca 127.0.0.1:21213** adresinde çalışır; internete açık sunucu değildir ve TikTok hesap şifresi istemez.
- Hediye olayını **yalnızca** `https://aifootballlive.github.io` kökeninden bağlanan yönetici tarayıcısına iletir. Yönetici tarayıcısı yalnızca MFA (AAL2) oturumuyla Supabase'e şut kaydeder.
- Yöneticinin bilgisayarı ve bu köprü çalışmazken gerçek TikTok hediyeleri otomatik işlenmez. Köprü çalışırken çevrimdışı LIVE oda için deneme yapar.
- GitHub Pages tek başına TikTok hesabının olaylarını alamaz. Tamamen sunucusuz/PC kapalı çalışması için ayrı bir barındırılan relay gerekir.
- Bu üçüncü taraf bağlayıcı TikTok tarafından resmî olarak desteklenmez; TikTok API değişikliklerinde güncelleme gerekebilir.
- Portu internete yönlendirmeyin. Bilgisayarınızdaki yerel bağlantıda sorun varsa Node, Chrome/WebSocket ve tarayıcının yerel ağa erişim izinlerini kontrol edin.

## Test kontrolü
Bilgisayarda köprü konsolunda `TikTok LIVE baglandi` yazmalı. Yönetici görünümünde bağlantı `Canlı bağlı` olmalı. Bir adet eşleşen hediye gelirken konsolda `Hediye:` görünür, ilgili takımın bekleyen şutu artar. Maç geri sayımı bitince şut başlar; topa vurduğu an sayaç düşer.

**Not:** Burada gerçek TikTok canlı yayınına bağlanılıp test yapılmış değildir. Canlı test kullanıcı tarafından yapılacaktır.
