# Doğrulama durumu

6 Ekim 2026 tarihinde bu çalışma ortamında:

| Kontrol                               | Sonuç                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| TypeScript                            | Geçti                                                                                         |
| ESLint                                | Geçti                                                                                         |
| Kritik iş mantığı ve servis testleri  | 3 test grubu, 50 test geçti                                                                   |
| Farklı cihaz saat dilimi              | Testler `America/Los_Angeles` saat diliminde de geçti                                         |
| Android JavaScript/Hermes paketi      | Oluşturuldu, yaklaşık 3,3 MB                                                                  |
| iOS JavaScript/Hermes paketi          | Oluşturuldu, yaklaşık 3,3 MB                                                                  |
| Temiz Expo Audio paketine native yama | `patch-package --error-on-fail` ile uygulandı                                                 |
| Gerçek yayın kaynağı                  | HLS üzerinden AAC, 44.100 Hz, stereo olarak doğrulandı                                        |
| Android native debug derlemesi        | Başarılı; arm64-v8a APK üretildi                                                              |
| Android native deneme derlemesi       | Başarılı; arm64-v8a release APK, gömülü JavaScript ve imza doğrulaması                        |
| iOS native ayarları                   | Türkçe dil, arka plan sesi, mikrofon izninin olmaması ve kaynak koddan derleme kontrol edildi |
| iOS native derlemesi                  | Linux ortamında yapılmadı; macOS/Xcode gerekir                                                |
| Android 15 emülatöründe oynatma       | 1.0.1 uygulaması “Canlı”; native MediaSession PLAYING, hata yok                               |
| Telefonda çalıştırma                  | Bağlı cihaz yok; yapılmadı                                                                    |

Sunucusuz Android deneme APK: `artifacts/kafa-radyo-1.2.0.apk` (arm64-v8a, sürüm kodu 5). JavaScript paketi APK içinde bulunduğu ve `debuggable` bayrağının kapalı olduğu kontrol edildi. Bu APK şablonun geliştirme anahtarıyla imzalanmıştır; mağaza yayımlamasında kendi imzalama anahtarınız kullanılmalıdır.

Android debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Bu geliştirme APK'sı Metro sunucusuna ihtiyaç duyar. Kontrol komutu:

```bash
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Native ses yaması Android'de kaynak koddan derlendi. Android API 36, NDK 27.1.12297006, JDK 17 ve Gradle 9.3.1 kullanıldı. Ortamın başlangıçta tam JDK içermemesi ve geçici kota sınırı, görev için kurulan JDK ve proje diskindeki Git dışında tutulan Gradle önbelleğiyle giderildi.

Gerçek cihazda arka plan sesi, Bluetooth/araç kontrolleri, telefon görüşmesi, pil tasarrufu, kesintili ağ ve uygulama kapalıyken haftalık bildirim teslimi henüz doğrulanmadı. README içindeki cihaz kontrolleri Android ve iOS yayımlaması öncesinde tamamlanmalıdır. Birim testleri ve paket üretimi bu davranışlar için cihaz testi yerine geçmez.

`npm audit fix` uyumlu güncellemeleri uyguladı; geçişli geliştirme araçlarında kalan uyarılar README'de belirtilmiştir.

1.0.1 için ağ dönüşünün ses oturumu hazırlanmasıyla çakışması, bu sırada kullanıcının duraklatması ve ana kaynaktan alternatif kaynağa geçiş ve ağ kesintisinde tekrarlanan native duraklatma olayları için regresyon testleri geçti. Emülatörde native oynatıcı durumu doğrulandı; fiziksel telefonun hoparlöründen ses duyulması bu ortamda doğrulanmadı.

Son 1.0.1 emülatör kontrolünde Wi-Fi ve mobil veri 10 saniyeden uzun süre kapatıldı. Uygulama “İnternet bağlantısı bekleniyor” durumunu korudu. Ağ geri açıldığında kullanıcı dokunmadan “Canlı” durumuna geçti; MediaSession tekrar PLAYING ve error=null bildirdi. Son ARM64 APK imzası, sürüm kodu 2 ve gömülü JavaScript paketi doğrulandı.

1.0.2: kullanıcı fiziksel telefonda yayının başladığını bildirdi. Güvenli bağlantı uyarısındaki tarih/saat yönlendirmesi kaldırıldı. TypeScript, ESLint ve ARM64 release derlemesi geçti; sürüm kodu 3 ve APK imzası doğrulandı. Yeni APK `artifacts/kafa-radyo-1.0.2.apk` konumundadır.

## 1.1.0 güncellemesi

SlowTürk, Kral FM, Radyo Türk 94.4, TRT FM ve TRT Radyo 1 eklendi. Resmî web oynatıcılarının kullandığı beş kaynak `ffprobe` ile ses akışı olarak doğrulandı. İstasyon değişirken bekleyen yeniden bağlantı ve henüz hazırlanmakta olan eski ses oturumu için iki regresyon testi eklendi; toplam 50 test geçti. TypeScript ve ESLint geçti. Android/iOS sürüm bilgileri 1.1.0, derleme kodu 4 oldu; iOS native derlemesi bu Linux ortamında yapılmadı.

Android 15 emülatöründe Kafa Radyo, SlowTürk, Kral FM, Radyo Türk 94.4, TRT FM ve TRT Radyo 1 sırayla başlatıldı; her biri “Canlı” durumuna geçti ve MediaSession PLAYING bildirdi. Son arayüzde ana oynatma düğmesinin ekran içinde olduğu, “Radyo değiştir” penceresinin altı istasyonu gösterdiği, TRT FM seçiminde kilit ekranı başlığının TRT FM olduğu ve program ekranında Kafa Radyo kayıtları yerine eksik akış açıklamasının göründüğü doğrulandı. Emülatör sesi host üzerinde dinlenmedi; yeni istasyonların fiziksel telefondaki ses çıkışı kullanıcı testi gerektirir.

Son 1.1.0 ARM64 release APK başarıyla derlendi; imza, gömülü JavaScript, arm64-v8a mimarisi ve sürüm kodu 4 doğrulandı. Önceki APK ile aynı paket adı ve imza kullanılır.

## 1.2.0 program takibi ve kişisel liste

Program seçimi aynı istasyon ve başlığın tüm yayın günlerine genişletildi. Nihat’la Sivrisinek’in paketlenmiş akıştaki altı yayın kaydı için ayrı haftalık tetikleyiciler oluşur. Favoriden çıkarma ve hatırlatıcı açma/kapatma tüm gruba uygulanır. İzin reddi, kısmi native kurulum hatasında geri alma, eski tek günlük tercihlerin genişletilmesi ve aynı adlı farklı istasyonları ayırma testleri eklendi. Kişisel radyo ekleme/çıkarma, yeniden yükleme, hazır radyoyu geri ekleme, yinelenen/geçersiz URL ve bozuk kayıt testleri eklendi. Toplam 67 test geçti; TypeScript ve ESLint geçti.

Android 15 emülatöründe program favoriye alınarak hatırlatıcıların otomatik açılması kontrol edildi. Uygulamanın kendi Notifee veritabanında Nihat’la Sivrisinek’in altı gün kaydı için altı native bildirim kaydı bulundu. Bildirimlerin gelecekte fiziksel cihazda teslimi bu kontrolün kapsamına dahil değildir.

Son native arayüz kontrolünde özel radyo ekleme, hazır radyo çıkarma, özel radyo silme ve program takibi uygulama zorla kapatılıp yeniden açıldıktan sonra korundu. Program favoriden çıkarıldığında tüm günlerin favori kartları ve altı native bildirim kaydı kaldırıldı. 1.2.0 ARM64 release derlemesi başarılı; APK imzası, sürüm kodu 5, mimari ve gömülü JavaScript doğrulandı. APK `artifacts/kafa-radyo-1.2.0.apk` konumundadır.
