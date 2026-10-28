# Uygulama kapsamı ve canlı yayını koruma

- Kullanıcı futbol AI ve Dünya Kültür Şampiyonası (DKŞ) geliştirmelerini ayrı sohbetlerde yürütür. İstek hangi uygulamaya aitse yalnız o uygulamanın gerekli dosyalarını değiştir. Ortak yönetim merkezi değişiklikleri ancak kullanıcı bunu istediğinde yapılır.
- Açık uygulamaları, OBS kaynaklarını veya yönetim merkezinin tamamını geliştirme sonrasında otomatik yenileme. Gerekiyorsa kullanıcıya hangi ekranı yenilemesi gerektiğini söyle; kullanıcı kendisi yeniler.
- Bir uygulamadaki değişiklik diğer uygulamanın ekranını yenilememeli, iframe belgesini yeniden oluşturmamalı veya sunucusunu yeniden başlatmamalıdır. Sekme değişimi mevcut belgeleri ve girilmiş alanları korumalıdır.
- Futbolun mevcut kendi yenile düğmesi futbolun içinde kalır. DKŞ içindeki yenile düğmesi yalnız DKŞ yönetimi ve önizlemesini yeniler; üst yönetim merkezini veya futbol ekranını yenilemez.
- Çalışan sunucuları, özellikle 8892 futbol ve futbol proxy'sini de barındıran 8894 ortak sunucuyu, canlı yayını etkileyebilecek biçimde kendiliğinden yeniden başlatma. Gereken sunucu yeniden başlatmasını kullanıcıya açıkça bildir ve uygun zamanı kullanıcıyla belirle.
- Doğrulamayı ayrı geçici veri tabanı ve tarayıcıyla yap. Futbol ekranı için testlerde sahte yerel sayfa kullan; gerçek yayına test olayı gönderme. Mevcut canlı kayıtları, skorları, ayarları ve oturumları koru.

Yönetim merkezi `uygulamalarim.html` dosyasıdır. Üst seviye merkez yalnız sekmeleri yönetir. DKŞ yönetimi aynı dosyanın `?app=culture&embedded=culture` görünümünde, futbol yönetimi `/football/live.html` içinde bağımsız iframe belgeleri olarak açılır. İkisi de ilk seçildiklerinde yüklenir; sekme değiştirmek bunları yeniden yüklemez.
