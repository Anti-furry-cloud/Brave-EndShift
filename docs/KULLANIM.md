# Türkçe kullanım

Brave-EndShift, YouTube videosunun ne zaman biteceğini seçmeni sağlar. Özellikle müzik videosunun sonundaki reklamı veya sessiz kısmı döngüde her tekrarda atlamak için kullanılabilir. Arayüz İngilizcedir; bu belge Türkçe kullanım kılavuzudur.

## Kurulum

1. Dağıtım ZIP'ini çıkar veya kaynak kodu indir.
2. Brave'de `brave://extensions` adresini aç.
3. **Geliştirici modu** seçeneğini etkinleştir.
4. **Paketlenmemiş öğe yükle** düğmesine bas ve içinde `manifest.json` bulunan klasörü seç.
5. Açık YouTube sekmelerini yenile.

## Bitiş belirleme

1. Standart bir YouTube videosu aç.
2. Videoyu bitmesini istediğin ana getir. Hassas seçim için videoyu o anda duraklatabilirsin.
3. Eklentiyi aç ve **Set ending here** (burayı bitiş olarak belirle) düğmesine bas.
4. Geri sarıp oynat. Video seçtiğin zamana ulaşınca sondaki bölüm atlanır.

## Döngüde dinleme

Videoya sağ tıklayıp YouTube'un **Döngü** seçeneğini aç. Örneğin 4 dakikalık bir videonun son 20 saniyesinde reklam varsa 3:40'ı bitiş olarak belirle. Video her turda 3:40'a gelince başa döner ve çalmaya devam eder. Eklenti paneli döngünün açık olup olmadığını gösterir.

Döngü kapalıysa seçtiğin noktada videonun gerçek sonuna geçilir. Ardından YouTube kendi ayarlarına göre videoyu bitirir veya oynatma listesini/otomatik oynatmayı devam ettirir. Eklenti sahte bitiş olayı üretmez ve sonraki video düğmesine basmaz.

Kayıt aynı videoyu tekrar açtığında da geçerlidir. **Remove ending** (bitişi kaldır) ile silebilirsin. Duraklatılmış video, zaman seçerken yerinden oynatılmaz.

Başlangıçtan ve sondan en az bir saniye uzakta bir nokta seç. Reklam sırasında kayıt yapılamaz. Bu sürüm standart masaüstü `/watch` sayfalarına yöneliktir; Shorts, gömülü videolar ve canlı yayınlar kapsam dışıdır.

YouTube'un gösterdiği toplam süre ve ilerleme çubuğu aynı kalır; eklenti oynatmanın fiilen biteceği noktayı değiştirir. Veriler bu tarayıcı profilinde tutulur ve geliştiriciye gönderilmez. Kaldırıldığında kayıtlar da silinir. Geliştirici/GitHub bağlantısı yalnızca tıklayınca açılır.

## Sorun giderme

- Yeni kurduktan veya eklentiyi yeniden yükledikten sonra YouTube sekmesini yenile.
- Video yüklenmediyse birkaç saniye bekle; reklam varsa bitmesini bekle.
- Sondaki bölümü izlemek için kayıtlı bitişi kaldır.
- YouTube'un oynatıcı yapısındaki değişiklikler uyumluluğu etkileyebilir. Gerçek Brave medya motoruyla yerel döngü/bitiş testi geçti; canlı YouTube entegrasyonu henüz test edilmedi.
- Tarayıcının arka plan sekmesi kısıtlamaları bitişte küçük gecikmeler oluşturabilir; kesintisiz ses döngüsü garantisi yoktur.
