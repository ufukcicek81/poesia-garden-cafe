<p align="center"><img src="icons/logo.svg" alt="Poesia Garden Cafe" width="120"></p>

# Poesia Garden Cafe v1.0.0

Bahçe kafe için adisyon ve işletme uygulaması: masalar, sipariş, mutfak & bar ekranı, paket servis, rezervasyon, menü, kasa & gün sonu ve raporlar. Telefonda, tablette ve bilgisayarda çalışır; internet gerekmez. Ana ekrana eklenebilir (PWA).

## Çalıştırma
- `index.html` dosyasını tarayıcıda aç ya da klasörü bir web sunucusunda yayınla (ör. `python3 -m http.server`).
- Telefonda/tablette tarayıcı menüsünden **Ana ekrana ekle** ile uygulama gibi kullanılır.

## İlk giriş
- Kullanıcı: `poesia`
- PIN: `1234`

İlk girişten sonra **Ayarlar → Personel** bölümünden PIN'i değiştir ve garson / mutfak hesaplarını aç.

## Özellikler
**Masalar**
- Alanlara göre masa planı (Bahçe, Teras, İç Salon; ayarlardan düzenlenir)
- Masa durumu renkli: boş, dolu, hesap istendi, rezerve
- Her masada açık tutar, oturma süresi, garson; “hazır” ve “gönderilmedi” uyarıları
- Masa taşıma ve masa birleştirme

**Adisyon**
- Kategorili ürün seçimi, arama, adet artır/azalt
- Ürün notu (şekersiz, acısız… hazır not düğmeleri)
- Mutfağa / bara gönderme (istersen mutfak fişi yazdırır)
- İkram, iskonto (% / ₺), ürün iptali (neden kaydıyla), adisyon iptali
- Kişi sayısı, servis ücreti (ayarlardan %)
- Hesap yazdırma (58/80 mm termal veya A4)

**Ödeme**
- Nakit, kredi kartı, yemek kartı / diğer
- Hesabı bölme: tamamı, eşit bölme (kişi başı), ürün seçerek, serbest tutar
- Para üstü hesabı ve hızlı banknot düğmeleri
- Hesap kapanınca fiş yazdırma

**Mutfak & Bar ekranı**
- Mutfak / bar ayrı veya birlikte görünüm, bekleme süresine göre renk (10 dk sarı, 20 dk kırmızı)
- Ürüne dokununca “hazır”; hazır olanlar garsonun masa ekranında 🔔 ile görünür
- Yeni sipariş gelince sesli uyarı
- Tükenen ürünleri işaretleme (siparişe eklenemez, QR menüde “Tükendi” yazar)

**Paket / Gel-Al** — müşteri adı, telefon, adres ve not ile ayrı siparişler.

**Rezervasyon** — günlük liste, kişi sayısı, alan/masa, not; “Geldi” ile masaya oturtup adisyon açma. Rezerve masalar masa planında işaretlenir.

**Menü** — kategori ve ürün yönetimi, fiyat, hazırlayan (mutfak/bar), satışta/pasif, tükendi. Menü yazdırma (A4).

**QR Menü** — `menu.html` müşterilerin telefondan açtığı menüdür. **Menü → menu.json indir** ile dosyayı al, `menu.html` yanına yükle, QR kodu `…/menu.html` adresine yönlendir. Fiyat değişince yeniden indirip yüklemek yeterli.

**Kasa & Gün Sonu** — günlük tahsilat (nakit/kart/diğer), kasa girişi/çıkışı ve giderler, kasada olması gereken tutar, sayım farkıyla Z raporu ve yazdırma.

**Raporlar** — bugün / dün / 7 gün / bu ay / tarih aralığı: tahsilat, hesap sayısı, ortalama hesap, kişi başı, ikram, iskonto, iptaller, ödeme türleri, kategori, saat, personel, en çok satanlar; CSV dışa aktarma.

**Personel ve yetkiler**
- Yönetici: her şey
- Garson: masalar, paket, mutfak ekranı, rezervasyon (ödeme alma ve iskonto/ikram ayarlardan açılıp kapatılır)
- Mutfak / Bar: yalnızca mutfak ekranı
- PIN'ler cihazda SHA-256 ile şifreli saklanır

**Yedekleme** — tek dosya JSON yedek alma ve geri yükleme; satış verilerini temizleme.

## Önemli: veriler cihazda tutulur
Tüm veriler uygulamanın açıldığı cihazın tarayıcı hafızasında saklanır. Bu yüzden:
- **Birden fazla cihaz (ör. garson telefonu + mutfak tableti) şu an birbiriyle eşitlenmez.** Aynı cihazda iki sekme (ör. biri masalar, biri mutfak ekranı) birbirini anlık günceller.
- Düzenli olarak **Ayarlar → Yedek & Veri → Yedek indir** ile yedek al.

Cihazlar arası eşitleme için ileride küçük bir sunucu (backend) eklemek gerekir.

## Android APK
`android/` klasörü Geçer Nalbur ile aynı yöntemi kullanır (Android Studio / Gradle gerekmez). Gerekli araçlar için `android/build-apk.sh` başındaki listeye bak.

```bash
cd android
TOOLS=/araçların/klasörü KS_PASS='güçlü-bir-şifre' ./build-apk.sh
# çıktı: apk/PoesiaCafe-1.0.0.apk
```

İlk derlemede `poesia-cafe.p12` imza anahtarı oluşturulur. Bu dosyayı ve şifresini güvenli bir yerde sakla: güncellemeleri aynı anahtarla imzalamazsan telefondaki uygulama güncellenemez. (Anahtar git'e eklenmez.)

## Fiyatlar
Örnek menüdeki ürünler ve fiyatlar yer tutucudur; **Menü** bölümünden kendi menünle değiştir.
