# PhantomTrace

Instagram oturumuna, şifreye, cookie’ye veya resmi olmayan Instagram endpoint’lerine erişmeden, kullanıcı tarafından sağlanan snapshot dosyalarını karşılaştıran iki yerel sürüm.

## Sürümler

### 1. Linux + Flask dashboard

[`linux-flask/`](linux-flask/) klasöründe SQLite veritabanlı Flask uygulaması bulunur. Snapshot’ları API’ye gönderir, geçmişi saklar ve koyu temalı dashboard’da takipçi/takip edilen değişikliklerini gösterir.

Kurulum ve veri hazırlama: [`linux-flask/README.md`](linux-flask/README.md)

### 2. Tarayıcı konsolu JavaScript

[`console-js/`](console-js/) klasöründeki tek JavaScript dosyası Python veya sunucu gerektirmez. Tarayıcı konsoluna yapıştırıldığında yerel panel açar; kullanıcının seçtiği JSON/CSV snapshot dosyasını tarayıcı `localStorage` alanında saklar ve karşılaştırır.

Kullanım ve veri hazırlama: [`console-js/README.md`](console-js/README.md)

## Snapshot verisi nasıl temin edilir?

Bu proje Instagram’dan otomatik veri çekmez. Veriler yalnızca kullanıcının yetkili olduğu hesaplara ait dosyalardan sağlanmalıdır.

Instagram’da **Hesaplar Merkezi / Bilgilerini indir** veya benzer adı taşıyan veri dışa aktarma seçeneğini kullanabilirsiniz. Instagram arayüzündeki menü adları ve dışa aktarma formatı değişebileceğinden, indirilen dosyalar doğrudan uygun değilse `examples/snapshot.json` veya ilgili README’deki CSV formatına göre dönüştürülmelidir.

Alternatif olarak kullanıcı kendi yetkili veri kaynağından aşağıdaki yapıda JSON/CSV üretebilir:

```json
{
  "username": "ornek_kullanici",
  "profile_id": "12345",
  "followers": [{"username": "alice", "id": "1"}],
  "following": [{"username": "bob", "id": "2"}]
}
```

İlk dosya mevcut durumu kaydeder. Aynı kullanıcıya ait daha sonraki dosya yüklendiğinde iki snapshot arasındaki eklenen ve çıkarılan hesaplar hesaplanır.

## Gizlilik

Kişisel verileri public GitHub deposuna veya başka bir herkese açık alana yüklemeyin. Bu repository yalnızca uygulama kodunu içerir; gerçek snapshot dosyalarını Git’e eklemeyin.
