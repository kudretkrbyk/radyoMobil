# Kafa Radyo — minimal mobil radyo

Android ve iOS için TypeScript ve React Native uygulaması. Uygulamaya ait ekranlar, erişilebilirlik etiketleri, bildirimler ve hata mesajları Türkçedir. Programların resmî adları korunur. Kritik kod bölümlerinde Türkçe açıklama yorumları bulunur. İstasyonların resmî logoları yerine adlarının baş harfleri kullanılır; bu proje Kafa Radyo'nun resmî uygulaması değildir.

## Android deneme paketi

Güncel 1.2.0 deneme APK'sı `artifacts/kafa-radyo-1.2.0.apk` konumundadır. Önceki kurulumun üzerine güncelleme olarak kurulabilir. arm64-v8a cihazlar içindir ve JavaScript paketi içine gömülüdür. Geliştirme anahtarıyla imzalanmıştır; mağaza yayını için kendi imzanızı yapılandırın. Önceki sürümde Kafa Radyo yayını kullanıcı tarafından fiziksel telefonda doğrulandı. Yeni istasyonlar için aşağıdaki 1.1.0 doğrulama bilgilerine bakın.

## Kurulum ve çalıştırma

Node.js 22.13 veya üzeri gerekir; geliştirmede Node.js 24 kullanıldı. Bağımlılık sürümleri `package-lock.json` ile sabitlenir.

```bash
npm install
npm start
```

`npm install` sonunda `patch-package` native ses yamasını otomatik uygular. Temiz ve tekrarlanabilir kurulum için `npm ci` de kullanılabilir. Yama uygulanamazsa kurulum hata verir; yamasız uygulama yayımlanmaz.

Bu proje native Android/iOS klasörleri olan bir React Native uygulamasıdır. Expo'nun modül bağlama ve paketleme araçları ile güncel `expo-audio` kullanılır. Expo Go yeterli değildir; native uygulamayı derleyin. EAS, Expo hesabı, uzaktaki derleme servisi veya backend gerekmez. `expo-av` kullanılmaz. SDK 57'nin belgelenen uyumu için React Native 0.86.0 ve Expo Audio 57.0.5 seçildi.

### Android

Android Studio, SDK Platform 36, Build Tools 36, NDK 27.1.12297006 ve JDK 17 veya Gradle'ın desteklediği daha yeni bir JDK kurun. Android SDK konumunu `ANDROID_HOME` ile veya `android/local.properties` içindeki `sdk.dir` ile belirtin. Cihazın USB hata ayıklamasını açın ya da emülatörü başlatın. Ayrı terminalde:

```bash
npm run android
```

Bağımsız debug APK üretmek için:

```bash
cd android
./gradlew :app:assembleDebug
```

Debug APK geliştirme sunucusuna bağlanır. Yayıma hazırlıkta kendi imzalama anahtarınızla release yapılandırması yapın; şablondaki debug anahtarı mağaza yayını için kullanılmamalıdır. Release JavaScript paketi uygulamaya gömülür:

```bash
cd android
./gradlew :app:assembleRelease
```

### iOS

macOS, Xcode ve CocoaPods gerekir. Native hedefin minimum iOS sürümü 16.4'tür.

```bash
npm install
cd ios
pod install
cd ..
npm run ios
```

Gerçek cihaz için Xcode'da `ios/KafaRadyo.xcworkspace` dosyasını açın, geliştirme takımını ve imzalama ayarlarını seçin. `com.radyomobil` paket kimliğini kendi kimliğinizle değiştirebilirsiniz.

### Native yapılandırma

- Android'de `FOREGROUND_SERVICE` ve `FOREGROUND_SERVICE_MEDIA_PLAYBACK` izinleri ile `AudioControlsService` tanımlıdır. Kilit ekranı ve Bluetooth kontrolleri Media3 MediaSession üzerinden çalışır. `WAKE_LOCK` ses ve native uyku zamanlayıcısı içindir.
- Android 13 ve üstünde `POST_NOTIFICATIONS` izni ilk program hatırlatıcısı açıldığında istenir. Uygulama açılır açılmaz bildirim izni istenmez.
- Android 12 ve üstünde kesin alarm izni verilirse AlarmManager'ın kesin ve boşta çalışabilen alarmı kullanılır. Ayarlar → **Hatırlatıcı zamanlama izni** cihazdaki izin ekranını açar. İzin yoksa WorkManager kullanılır; pil tasarrufu nedeniyle hatırlatıcı gecikebilir. `USE_EXACT_ALARM` kullanılmaz.
- iOS'ta `UIBackgroundModes: audio` etkin, uygulama dili Türkçedir. Bildirim izni ilk hatırlatıcıda istenir. İşletim sistemi kendi izin pencerelerini cihazın dilinde gösterebilir.
- Mikrofon veya konum izni gerekmez. Android bulut yedeklemesi kapalıdır.
- Native klasörler depoya dahil edilmiştir. Normal geliştirmede `expo prebuild` çalıştırmak gerekmez. Tekrar üretim gerektiğinde native bildirim simgesini, yama ayarlarını ve özelleştirmeleri kontrol edin.

## Canlı yayın adresi

`src/data/stations.ts` dosyasında tek yapılandırma noktası:

```ts
export const RADIO_STREAM_URL =
  'https://stream.radyotvonline.net/hls/play/kafaradyo.m3u8';
```

6 Ekim 2026'da resmî sitenin `/assets/js/audio.js` dosyasındaki `hlsLink` değerinden tespit edildi. HTTP isteği geçerli AAC HLS ana manifesti döndürdü; kısa `ffprobe` kontrolü 44.100 Hz stereo AAC ses doğruladı. Kullanıcıya özel, geçici `UserCode` içeren alt manifest adresi sabitlenmez. Ses doğrudan native oynatıcıya gider; WebView veya web sayfası oynatma yoktur.

1.0.1 sürümünde, ses oturumu hazırlanırken internet kesilip geri geldiğinde yeniden bağlantı isteğinin kaybolması düzeltildi. Ana kaynak başarısız olduğunda aynı istasyonun `https://moondigitaledge2.radyotvonline.net/kafaradyo/playlist.m3u8` adresi denenir; bu adres de 44.100 Hz stereo AAC olarak doğrulandı. Geçici oturum adresleri saklanmaz. Bağlantı hataları yeniden deneme sırasında Türkçe olarak görünür kalır.

Adres ileride değişirse tarayıcının geliştirici araçlarında **Ağ** panelini açın, resmî web oynatıcısını başlatın ve `m3u8`, `aac`, `mp3` isteklerini inceleyin. HTML/JavaScript'teki oynatma kaynağını ve yanıtın gerçekten ses/manifest olduğunu doğrulayın. Reklam ve metadata adreslerini ses kaynağı sanmayın. Doğrulanmış adres bulunamazsa bu sabiti boş bırakın; uygulama anlaşılır bir yapılandırma mesajı gösterir.

## Mimari

```text
src/
  app/                     Türkçe ekranlar, ortak bileşenler, tema
  core/
    audio/                 İstasyondan bağımsız tek native oynatıcı
    storage/               MMKV erişim sınırı
  data/                    İstasyon yapılandırması
  features/
    player/store/          Açık oynatıcı durumları
    schedule/              Sağlayıcı ve yayın akışı durumu
    favorites/             Favori/hatırlatıcı işlemleri
    notifications/         Yerel haftalık bildirimler
    settings/              Cihazdaki kullanıcı tercihleri
  types/                   İstasyon, program, ayar modelleri
  utils/                   İstanbul saati, favoriler, retry hesapları
assets/data/                İnternetsiz yayın akışı
patches/                   Native ses eklemeleri
```

Ekranlar native depolamaya erişmez. Zustand store'ları oynatıcı, program akışı, favoriler ve ayarlar olarak ayrılmıştır. `AudioPlayerService.playStation(station)` istasyon modelini alır; içinde Kafa Radyo'ya özgü bir yayın adresi yoktur. Durumlar `idle`, `connecting`, `playing`, `paused`, `buffering`, `reconnecting`, `error` olarak modellenir ve Türkçe metinlere çevrilir.

`ScheduleProvider` veri kaynağını ekrandan ayırır. `LocalScheduleProvider` paketlenmiş JSON'u okur. Önbellek `programSchedule` ve `lastUpdated` alanlarını tutar; geçerlilik süresi 6 saattir. Önbellek bozuksa paket verisine dönülür. Gelecekte aynı arayüzle uzaktan sağlayıcı eklenebilir; bu sürümde program akışı için ağ isteği yapılmaz.

Saatler `Europe/Istanbul` kullanılarak hesaplanır. Gece yarısını aşan yayınlar önceki günden kontrol edilir; bitiş anı programa dahil edilmez. Sonraki program gelecek haftayı da kapsar. Paketlenen 84 yayın kaydı 6 Ekim 2026'da resmî siteden alınmıştır; uygulama içindeki akış zamanla eskiyebilir. Resmî akıştaki çakışmalarda en geç başlayan kayıt önceliklidir.

## Ses, bağlantı ve uyku zamanlayıcısı

Native ses oturumu sessiz modda ve arka planda etkinleştirilir. Kilit ekranına istasyon/program adı ve sunucu bilgisi yazılır. Bluetooth bağlantısı kesilince veya başka uygulama ses odağı alınca native ses katmanının kesinti davranışı uygulanır. Kullanıcının duraklatması yeniden bağlantı denemesini iptal eder.

Ağ NetInfo ile izlenir. Yeniden bağlantıda bekleme 1, 2, 4, 8, 16, 30 saniye şeklinde artar, 30 saniyeyle sınırlandırılır. 20 saniye yükleme sınırı sonsuz tamponlamayı önler. Wi-Fi/mobil veri geçişlerinde politika yeniden değerlendirilir. Mobil veri kapalıysa o ağda yayın başlatılmaz. Kullanıcı duraklattıysa internet dönüşünde oynatılmaz. Ağ dönüşünde otomatik devam tercihi cihazda tutulur.

Uyku seçenekleri: 15, 30, 45, 60, 90 dakika veya **Program bitince**. Son seçenek İstanbul'da hesaplanan gerçek bitiş zamanını kullanır. Yalnızca JavaScript `setTimeout`'una güvenilmez: Expo Audio'nun Android `Handler` ve iOS `DispatchWorkItem` zamanlayıcılarıyla genişletilen native oynatıcısı sesi durdurur. Yeniden bağlantı aynı bitiş zamanını korur. Native sonlandırma durumu retry'ı iptal eder. Uygulama geri açılırken de geçmiş zaman kontrol edilir.

`patches/expo-audio+57.0.5.patch` ayrıca Android medya kontrol adlarını Türkçeleştirir, **Durdur** kontrolü ekler ve native oynatma niyeti/uyku bitişini JavaScript'e aktarır. Bu nedenle `expo-audio` sürümü tam sabitlenmiştir. `package.json` içindeki `expo.autolinking.buildFromSource` ses modülünün yamalı kaynak koddan derlenmesini zorunlu kılar; kullanılmayan WebView ve font modülleri native bağlamadan çıkarılmıştır. iOS'ta `ios/Podfile.properties.json` içindeki `ios.usePrecompiledModules: false` native modülleri kaynak koddan derletir; hazır Expo Audio ikilileri bu yamayı içermez. Ses modülü yükseltilirken yama yeniden uygulanmalı ve Android/iOS native derlemeleri ile cihaz testleri tekrarlanmalıdır.

Ham ICY/ID3 şarkı metadata'sı bu sürümde ayrıştırılmaz. Kilit ekranı metadata'sı yerel yayın akışından beslenir; yayın akışında mevcut program yoksa istasyon adı gösterilir. Şarkı bilgisi olmaması oynatmayı etkilemez.

Mobil işletim sistemi uygulamayı zorla kapatırsa ses ve çalışan uyku zamanlayıcısı sonlanır. Özellikle iOS'ta uzun internet kesintisi sırasında uygulama askıya alınırsa JavaScript yeniden bağlantısı uygulama etkinleşene kadar ertelenebilir. Kısa ağ geçişleri ve ekran kilidi davranışı gerçek cihazda doğrulanmalıdır; burada sınırsız arka plan yaşam süresi garantisi verilmez.

## Cihazda saklanan bilgiler ve gizlilik

MMKV'de ayarlar, favori program kimlikleri, hatırlatıcı kimlikleri, program akışı önbelleği ve açılmayı bekleyen program bildirimi tutulur. Bir program seçilince aynı istasyon ve program başlığına sahip tüm yayın kayıtları favoriye ve haftalık hatırlatıcılara eklenir. Günlere ait tetikleyiciler ayrı kimliklerle saklanır. Kişisel radyo listesi, özel yayın adresleri ve hazır listeden çıkarılan radyolar da MMKV içinde tutulur. Uyku zamanlayıcısı aktif oturuma aittir; uygulama yeniden başlatılınca eski bir zamanlayıcı kurulmaz.

Hesap, backend, Firebase, analytics, reklam SDK'sı ve izleme yoktur. Tercihler sunucuya gönderilmez. Canlı yayın isteği doğrudan yayın sağlayıcısına gider; sağlayıcı normal ağ bağlantısının IP adresini görebilir. Yayın içeriğindeki radyo reklamları yayın sağlayıcısının kontrolündedir.

## Yerel bildirimler

**Başlayınca bildir** seçimi programı favoriye de ekler ve haftalık yerel tetikleyici kurar. Ayarlardaki süre 0, 5, 10 veya 15 dakikadır. Bildirim zamanı geçmişse sonraki hafta seçilir; gece yarısından önceye düşen hatırlatıcılar desteklenir. Favoriden çıkarınca veya hatırlatıcıyı kapatınca ilgili native bildirim iptal edilir. Medya bildirimi iptal edilmez.

Programdan bildirime dokunulduğunda **Program** ekranı açılır. **CANLI YAYINI AÇ** düğmesi vardır. Otomatik oynatma varsayılan olarak kapalıdır. Ön plandaki, arka plandaki ve soğuk açılıştaki bildirim seçimleri ele alınır. Haftalık tetikleyiciler işletim sisteminde kayıtlı olduğu için uygulama kapalıyken de çalışır; push sunucusu gerekmez.

Uygulama yeniden etkinleştiğinde tetikleyiciler güncel ayar ve saat dilimiyle eşitlenir. iOS tekrarları cihaz takvimine bağlı olduğundan uygulama kapalıyken cihazın saat dilimi değiştirilirse bir sonraki açılışa kadar bildirim saati kayabilir. iOS en fazla 64 bekleyen bildirim tutar; Android üreticisinin güç tasarrufu veya kullanıcının uygulamayı zorla durdurması da teslimi etkileyebilir. Kurulamayan hatırlatıcı açık gösterilmez. Bildirim izni geri alınırsa kullanıcı cihaz ayarlarından yeniden açmalıdır.

## Başka istasyon ekleme

1. `src/data/stations.ts` içindeki listeye bir `RadioStation` ekleyin.
2. Program JSON'una aynı `stationId` ile benzersiz program kimlikleri ekleyin.
3. İstasyon mevcut radyo seçim ekranında otomatik görünür; programlar seçilen `stationId` ile filtrelenir.
4. Kullanıcı özel radyosunu kod değiştirmeden **Radyo listem** ekranından ad ve HTTPS yayın adresiyle ekleyebilir.

```ts
const yeniIstasyon: RadioStation = {
  id: 'yeni-radyo',
  name: 'Yeni Radyo',
  streamUrl: 'https://ornek.com/dogrulanmis-yayin.m3u8',
  description: 'Yeni radyo istasyonu',
};
await audioPlayer.playStation(yeniIstasyon);
```

Bu örnekteki URL yer tutucudur. Üretimde doğrulanmış ses adresi gerekir. Çoklu istasyon seçimi, arama, podcast ve araç uygulamaları bu MVP'de geliştirilmedi. Ses servisi istasyondan bağımsızdır; alternatif kalite adresleri daha sonra istasyon yapılandırmasına eklenebilir.

## Kontroller ve doğrulama

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform android --platform ios --output-dir dist
```

Testler İstanbul saati/gece yarısı/hafta sınırı, akış ayrıştırma, favori ekleme/çıkarma, bildirim zamanı ve haftalık native tetikleyici kurulumu, uyku süresi, backoff, manuel duraklatma, internet dönüşü ve mobil veri politikasını kapsar. Native modüllerin birim testlerindeki taklitleri gerçek cihaz testinin yerine geçmez.

Doğrulama durumu `VALIDATION.md` içindedir. Gerçek Android ve iOS cihazlarda şunları kontrol edin:

- Canlı yayını başlatın, telefonu kilitleyin ve yayın devam ederken kilit ekranından duraklatın/yeniden başlatın.
- Bluetooth kulaklık ve araç kontrolünü, kulaklık çıkarılmasını ve telefon görüşmesini deneyin.
- Wi-Fi/mobil veri/uçak modu geçişlerini ve manuel duraklatılmış halde internet dönüşünü kontrol edin.
- Mobil veri kapalıyken ağ değiştirin; yayının durduğunu doğrulayın.
- Favori ve hatırlatıcı kurun, uygulamayı kapatın; bildirimi ve program ekranına dönüşü kontrol edin.
- Uyku zamanlayıcısını ekran kilitliyken tamamlayın; yeniden bağlantı sırasında da bitiş zamanının korunduğunu doğrulayın.
- Büyük yazı, ekran okuyucu, açık/koyu tema ve bildirim izni reddini deneyin.

6 Ekim 2026'daki `npm audit fix` uyumlu güncellemeleri uyguladı. Araç zincirindeki geçişli paketler için hâlâ audit uyarıları bulunuyor; yayımlama öncesinde audit çıktısı incelenmeli. `--force` ile desteklenen React Native/Expo sürümünü eski sürüme düşürmek uygulanmadı.

## Kaynaklar

- [Kafa Radyo resmî sitesi ve yayın akışı](https://www.kafaradyo.com/)
- [Resmî web oynatıcısı](https://www.kafaradyo.com/assets/js/audio.js)
- [Expo Audio: native arka plan sesi ve kilit ekranı](https://docs.expo.dev/versions/latest/sdk/audio/)
- [React Native projesine native Expo modülleri ekleme](https://docs.expo.dev/bare/installing-expo-modules/)
- [Notifee yerel tetikleyiciler](https://notifee.app/react-native/docs/triggers/)

1.0.2 sürümünde geçici güvenli bağlantı hatası, telefonun tarih ve saatinin yanlış olduğunu ima etmeden alternatif bağlantı denemesi olarak açıklanır. Kullanıcı 1.0.1 sürümünde fiziksel telefonda yayının başladığını doğruladı.

## 1.1.0 çoklu radyo güncellemesi

Ana ekrandaki **Radyo değiştir** düğmesiyle açılan listeden Kafa Radyo, SlowTürk, Kral FM, Radyo Türk 94.4, TRT FM ve TRT Radyo 1 arasında geçiş yapılır. Farklı radyoya dokunmak doğrudan o yayını başlatır; eski istasyonun bekleyen bağlantısı iptal edilir. Kilit ekranı başlığı ve program bilgileri seçilen istasyona göre güncellenir. Paketlenmiş program akışı şu anda yalnızca Kafa Radyo içindir; diğer istasyonlarda eksik program akışı açıkça belirtilir.

6 Ekim 2026'da doğrulanan resmî oynatıcı kaynakları:

| İstasyon | Ses kaynağı | Resmî kaynak |
| --- | --- | --- |
| SlowTürk | `https://stream.radyotvonline.net/hls/play/slowturk.m3u8` | [Web oynatıcı ayarı](https://www.slowturk.com.tr/api/config) |
| Kral FM | `https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8` | [Kral FM](https://www.kralmuzik.com.tr/radyo/kral-fm) |
| Radyo Türk 94.4 | `https://radyo.yayindakiler.com:4028/;` | [Radyo Türk](https://www.radyoturk.com.tr/) |
| TRT FM | `https://trt.radyotvonline.net/trtfm` | [TRT oynatıcı kaynakları](https://radyo.trt.net.tr/player.js?v=3.2.1) |
| TRT Radyo 1 | `https://trt.radyotvonline.net/trt1` | [TRT oynatıcı kaynakları](https://radyo.trt.net.tr/player.js?v=3.2.1) |

Radyo Türk MP3; diğer yeni istasyonlar AAC, 44.100 Hz stereo olarak `ffprobe` ile doğrulandı. Kaynaklar üçüncü taraf web sayfası yerine doğrudan native oynatıcıya aktarılır.

## 1.2.0 program takibi ve kişisel radyo listesi

Bir programın herhangi bir günündeki **Favoriye ekle** düğmesi, aynı radyodaki aynı adlı programın tüm yayın kayıtlarını favoriye ekler ve bildirim izni ister. İzin verildiğinde her kayıt için haftalık bildirim otomatik kurulur. Mevcut akışta Nihat’la Sivrisinek hafta içi 18.00 ve cumartesi 17.00 olmak üzere altı yayın kaydına sahiptir; tamamı tek seçimle takip edilir. Favoriden çıkarma tüm bu günleri ve bildirimlerini kaldırır. **Hatırlatıcı** düğmesi programın tüm günleri için birlikte açılır/kapanır. İzin reddedilirse favori seçimi korunur, hatırlatıcı açık gösterilmez. Önceki sürümde tek gün favorilenen kayıtlar açılışta diğer günlere genişletilir; açık olan eski hatırlatıcılar da genişletilir.

**Radyo değiştir → Radyo listemi düzenle** ekranından kullanıcı kendi radyo listesini yönetir. Hazır radyolar listeden çıkarılabilir ve yeniden eklenebilir. Kullanıcı radyo adı ve doğrudan HTTPS ses/HLS yayın adresiyle özel radyo ekleyebilir. Radyo web sayfasının adresi canlı ses kaynağı değildir; geçersiz/tekrarlanan adreslerde Türkçe açıklama gösterilir. Liste yerel olarak saklanır, yeniden açılış ve uygulama güncellemesinde korunur. Dinlenen radyo silinirse oynatma durur. Radyo listesinden çıkarma program favorilerini ayrıca silmez; o radyonun bildiriminden otomatik yayın başlatılmaz, program ayrıntısında radyoyu listeye yeniden ekleme yolu gösterilir. Özel radyoya otomatik program akışı üretilmez.
