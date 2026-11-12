# PhantomTrace Console JS

Python, Flask veya Linux kurulumu gerektirmeyen tek dosyalık sürüm.

## Kullanım

1. [`phantomtrace_console.js`](phantomtrace_console.js) dosyasını açın.
2. Tüm içeriği kopyalayın.
3. Tarayıcıda herhangi bir sayfayı açın.
4. Geliştirici konsolunu açın: `F12` veya `Ctrl+Shift+J`.
5. Scripti konsola yapıştırıp çalıştırın.
6. Açılan PhantomTrace panelinde **Snapshot seç** butonuna basın.
7. JSON veya CSV dosyanızı seçin.

İlk snapshot mevcut durumu kaydeder. Aynı kullanıcıya ait ikinci snapshot seçildiğinde eklenen ve çıkarılan hesaplar panelde gösterilir.

## JSON verisi nasıl temin edilir?

Script Instagram’dan otomatik veri çekmez. JSON dosyası şu yollarla hazırlanabilir:

- Instagram’ın **Hesaplar Merkezi / Bilgilerini indir** özelliğinden, yalnızca kendi hesabınıza ait yetkili veriyi dışa aktararak.
- Kullanıcının kendi yetkili veri kaynağından manuel olarak.
- Örnek yapıyı kullanarak elle veya küçük bir dönüştürücüyle.

Örnek:

```json
{
  "username": "ornek_kullanici",
  "profile_id": "12345",
  "followers": [{"username": "alice", "id": "1"}],
  "following": [{"username": "bob", "id": "2"}]
}
```

Instagram’ın indirdiği dosyanın yapısı bu örnekten farklı olabilir. Bu durumda yalnızca şu dört alanı içeren yeni bir JSON oluşturun: `username`, `profile_id`, `followers`, `following`.

## CSV formatı

```csv
username,profile_id,relation,member_username,member_id
ornek_kullanici,12345,followers,alice,1
ornek_kullanici,12345,following,bob,2
```

`relation` değeri yalnızca `followers` veya `following` olmalıdır. `member_id` isteğe bağlıdır.

## Veriler nerede tutulur?

Snapshot’lar scriptin çalıştırıldığı tarayıcı profilinin `localStorage` alanında tutulur. Veriler Flask sunucusuna gönderilmez. Tarayıcı panelindeki **Kayıtları sil** butonu tüm PhantomTrace kayıtlarını temizler.

Tarayıcı verilerini temizlemek veya gizli sekme kullanmak kayıtları silebilir. Farklı cihaz ve tarayıcılar ortak kayıt kullanmaz.

## Güvenlik sınırları

Bu script:

- Instagram şifresini veya cookie’lerini okumaz.
- Instagram DOM, GraphQL veya dahili endpoint’lerine istek göndermez.
- Otomatik takipçi/takip edilen taraması yapmaz.
- Yalnızca kullanıcının seçtiği yerel JSON/CSV dosyasını işler.

Gerçek kişisel snapshot dosyalarını GitHub’a yüklemeyin.
