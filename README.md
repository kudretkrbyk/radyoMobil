# Kafa Radyo Mobil

Türkçe arayüzlü, kişisel radyo listesi ve program takibi sunan React Native mobil uygulaması. Canlı yayınları dinleyin, sevdiğiniz programların tüm yayın günlerini takip edin ve başlamadan önce bildirim alın.

## Özellikler

- **Canlı radyo:** İstasyonlar arasında geçiş, arka planda oynatma ve kilit ekranı kontrolleri.
- **Kişisel radyo listesi:** Hazır radyoları ekleme/çıkarma ve ad + doğrudan HTTPS yayın adresiyle özel radyo ekleme.
- **Program takibi:** Bir programı favoriye ekleyince aynı radyodaki tüm yayın günleri birlikte takip edilir.
- **Otomatik hatırlatıcılar:** Bildirim izniyle her yayın günü için haftalık yerel bildirim; 0, 5, 10 veya 15 dakika önce hatırlatma.
- **Uyku zamanlayıcısı:** 15, 30, 45, 60, 90 dakika veya program bitişinde yayını durdurma.
- **Bağlantı yönetimi:** Ağ kesintisinden sonra yeniden bağlanma ve mobil veri kullanım tercihi.
- **Kalıcı tercihler:** Radyo listesi, favoriler ve ayarlar cihazda saklanır.
- **Türkçe deneyim:** Ekranlar, erişilebilirlik etiketleri ve uygulama bildirimleri Türkçedir; açık/koyu tema desteklenir.

Hazır listede **Kafa Radyo, SlowTürk, Kral FM, Radyo Türk 94.4, TRT FM ve TRT Radyo 1** bulunur. Paketlenmiş program akışı şu anda yalnızca Kafa Radyo için mevcuttur.

## Kullanım

1. **Radyo değiştir** düğmesinden dinlemek istediğiniz istasyonu seçin.
2. **Radyo listemi düzenle** ekranından kendi listenizi oluşturun. Özel radyo için web sitesi adresi yerine doğrudan HTTPS ses veya HLS (`m3u8`) yayın adresini girin.
3. **Programlar** ekranında bir programı favoriye ekleyin. Bildirim izni verildiğinde tüm yayın günlerinin hatırlatıcıları otomatik oluşturulur.
4. **Favoriler** ekranından program takibini yönetin. Favoriden çıkarma tüm günleri ve ilgili bildirimleri kaldırır.

## Teknolojiler

React Native · TypeScript · Expo Audio · Zustand · MMKV · React Navigation · Notifee

Proje native Android ve iOS klasörlerini içerir. Expo araçları modül bağlama ve paketleme için kullanılır. Native ses yaması nedeniyle uygulama native olarak derlenir; Expo Go ile çalıştırılmaz. Hesap veya backend kurulumu gerekmez.

## Geliştirme kurulumu

### Gereksinimler

- Node.js 22.13 veya üzeri.
- Android için JDK 17, Android SDK Platform/Build Tools 36 ve NDK 27.1.12297006.
- iOS için macOS, Xcode ve CocoaPods; minimum iOS sürümü 16.4.

Bağımlılıkları yükleyin ve geliştirme sunucusunu başlatın:

```bash
npm ci
npm start
```

`npm ci`, `patch-package` ile [native ses yamasını](patches/expo-audio+57.0.5.patch) otomatik uygular. Yama uygulanamazsa kurulum hata verir.

### Android

Android SDK konumunu `ANDROID_HOME` veya `android/local.properties` dosyasındaki `sdk.dir` ile belirtin. Emülatörü başlatın ya da USB hata ayıklaması açık bir cihaz bağlayın. Ayrı terminalde:

```bash
npm run android
```

Geliştirme sunucusuna ihtiyaç duymayan APK oluşturmak için:

```bash
cd android
./gradlew :app:assembleRelease
```

APK çıktısı: `android/app/build/outputs/apk/release/app-release.apk`.

Mevcut release yapılandırması geliştirme anahtarı kullanır. Mağaza dağıtımı için kendi imzalama anahtarınızı yapılandırın.

### iOS

```bash
cd ios
pod install
cd ..
npm run ios
```

Gerçek cihaz için `ios/KafaRadyo.xcworkspace` dosyasını Xcode ile açıp geliştirme takımınızı ve imzalama ayarlarını seçin. Native ses özelleştirmeleri nedeniyle normal geliştirmede `expo prebuild` çalıştırmanız gerekmez.

## Proje yapısı

```text
src/
  app/             Ekranlar, ortak bileşenler ve tema
  core/            Native oynatıcı ve yerel depolama
  data/            Hazır radyo istasyonları
  features/        Oynatıcı, istasyonlar, programlar, favoriler ve bildirimler
  types/           Ortak veri modelleri
  utils/           Program gruplama, saat ve bağlantı hesapları
assets/data/       Paketlenmiş program akışı
patches/           Native ses yaması
__tests__/         İş mantığı ve servis testleri
```

Hazır istasyonlar [stations.ts](src/data/stations.ts) içinde, program kayıtları [kafa-radio-schedule.json](assets/data/kafa-radio-schedule.json) içindedir. Program saatleri `Europe/Istanbul` saat dilimine göre hesaplanır.

## Kontroller

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Testler program gruplama, hatırlatıcı oluşturma/iptal etme, kalıcı radyo listesi, ağ dönüşü, istasyon değişimi ve uyku zamanlayıcısı davranışlarını kapsar. Android emülatöründe oynatma, liste kalıcılığı ve native bildirim kayıtları kontrol edilmiştir. iOS native derlemesi ile Bluetooth, telefon görüşmesi ve fiziksel cihazda bildirim teslimi ayrıca doğrulanmalıdır.

## Bildirimler ve veri saklama

Bildirim izni ilk hatırlatıcı kurulurken istenir. Android’de kesin alarm izni yoksa sistemin normal zamanlayıcısı kullanılır; pil tasarrufu bildirimleri geciktirebilir. iOS en fazla 64 bekleyen bildirim destekler. Uygulamayı işletim sistemi ayarlarından zorla durdurmak bildirim teslimini etkileyebilir.

Radyo listesi, favoriler ve ayarlar cihazda tutulur. Uygulama hesap, analitik veya reklam SDK’sı kullanmaz. Ses doğrudan yayın sağlayıcısından alınır; sağlayıcı bağlantının IP adresini görebilir. Yayınların içindeki reklamlar radyo sağlayıcısına aittir.

## Yayın kaynakları

- [Kafa Radyo](https://www.kafaradyo.com/)
- [SlowTürk](https://www.slowturk.com.tr/)
- [Kral FM](https://www.kralmuzik.com.tr/radyo/kral-fm)
- [Radyo Türk](https://www.radyoturk.com.tr/)
- [TRT Radyo](https://radyo.trt.net.tr/)

Bu proje radyo kuruluşlarının resmî uygulaması değildir. Yayın adresleri ve program akışları sağlayıcılar tarafından değiştirilebilir; güncel kaynaklar gerektiğinde yenilenmelidir.
