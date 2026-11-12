# PhantomTrace Linux + Flask

Linux üzerinde çalışan, SQLite snapshot geçmişi ve Flask dashboard içeren sürüm.

## Gereksinimler

- Python 3.10 veya üzeri
- Linux terminali

## Kurulum ve başlatma

```bash
cd linux-flask
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Dashboard adresi:

```text
http://127.0.0.1:5000
```

## Snapshot oluşturma

Uygulama Instagram’dan otomatik veri çekmez. Kullanıcı, yalnızca yetkili olduğu hesaplara ait verileri Instagram’ın **Hesaplar Merkezi / Bilgilerini indir** özelliğinden veya kendi yasal veri kaynağından temin etmelidir. İndirilen dosya farklı bir şemadaysa aşağıdaki PhantomTrace formatına dönüştürülmelidir.

JSON örneği:

```json
{
  "username": "ornek_kullanici",
  "profile_id": "12345",
  "followers": [
    {"username": "alice", "id": "1"}
  ],
  "following": [
    {"username": "bob", "id": "2"}
  ]
}
```

Düz kullanıcı adı dizileri de geçerlidir:

```json
{
  "username": "ornek_kullanici",
  "followers": ["alice", "charlie"],
  "following": ["bob"]
}
```

## API’ye veri gönderme

```bash
curl -X POST http://127.0.0.1:5000/api/sync \
  -H 'Content-Type: application/json' \
  --data @snapshot.json
```

İlk gönderim snapshot oluşturur. Aynı `username` ile ikinci gönderimden sonra dashboard’da şu farklar görünür:

- Yeni takip edilenler
- Takipten çıkarılanlar
- Yeni takipçiler
- Takibi bırakanlar

## CSV’den JSON’a dönüştürme

CSV formatı:

```csv
username,profile_id,relation,member_username,member_id
ornek_kullanici,12345,followers,alice,1
ornek_kullanici,12345,following,bob,2
```

CSV’yi uygulamanın `/api/sync` endpoint’ine doğrudan değil, JSON’a dönüştürerek gönderin. Tarayıcı konsolu sürümü CSV’yi doğrudan okuyabilir.

## Gizlilik

`phantomtrace.db` kişisel snapshot verilerini içerir. Git’e eklemeyin ve public depoya yüklemeyin. Sunucu yalnızca `127.0.0.1` üzerinde dinlenir.
