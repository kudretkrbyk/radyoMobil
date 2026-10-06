import { AppState } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { usePlayerStore } from '../../features/player/store/playerStore';
import { useSettingsStore } from '../../features/settings/store';
import type { RadioStation } from '../../types';
import { reconnectDelay } from '../../utils/backoff';

type NativePlayer = AudioPlayer & {
  setSleepDeadline: (timestamp: number) => void;
};
type NativeStatus = AudioStatus & {
  shouldPlay: boolean;
  sleepExpired: boolean;
  errorCode?: number;
  errorCause?: string;
};

// Tek oynatıcı uygulama boyunca yaşar; ekran değişimi ses oturumunu etkilemez.
class AudioPlayerService {
  private player?: NativePlayer;
  // Kullanıcının dinleme niyeti bağlantı durumundan ayrıdır; çevrimdışıyken de iptal edilebilir.
  private get wantsPlayback() {
    return usePlayerStore.getState().wantsPlayback;
  }
  private set wantsPlayback(value: boolean) {
    if (usePlayerStore.getState().wantsPlayback !== value) {
      usePlayerStore.setState({ wantsPlayback: value });
    }
  }
  private retry?: ReturnType<typeof setTimeout>;
  private watchdog?: ReturnType<typeof setTimeout>;
  private attempt = 0;
  private sourceIndex = 0;
  private generation = 0;
  private connecting = false;
  private pendingConnect = false;
  private previousShouldPlay = false;
  private ignorePauseUntil = 0;
  private initialized = false;
  private networkType?: string;
  private online = true;
  private settingsUnsubscribe?: () => void;
  private netUnsubscribe?: () => void;
  private appSubscription?: ReturnType<typeof AppState.addEventListener>;
  private audioSubscription?: ReturnType<AudioPlayer['addListener']>;

  initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    // Native erişilebilirlik önceliklidir; HTTP kontrolü gerekirse yalnızca dinleme isteği varken çalışır.
    NetInfo.configure({
      useNativeReachability: true,
      reachabilityShouldRun: () => this.wantsPlayback,
    });
    this.netUnsubscribe = NetInfo.addEventListener(state =>
      this.onNetwork(state),
    );
    this.settingsUnsubscribe = useSettingsStore.subscribe(() => {
      if (!this.canPlay() && this.wantsPlayback) {
        this.suspendForNetwork();
      } else if (
        this.wantsPlayback &&
        usePlayerStore.getState().status === 'error'
      ) {
        this.scheduleRetry(true);
      }
    });
    this.appSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        return;
      }
      const sleepAt = usePlayerStore.getState().sleepAt;
      if (sleepAt && Date.now() >= sleepAt) {
        this.pause();
        this.setSleepTimer(undefined);
      } else if (
        this.wantsPlayback &&
        this.player &&
        !this.player.playing &&
        this.canPlay()
      ) {
        this.scheduleRetry(true);
      }
    });
  }

  private ensurePlayer(): NativePlayer {
    if (!this.player) {
      this.player = createAudioPlayer(null, {
        updateInterval: 1000,
        preferredForwardBufferDuration: 10,
      }) as NativePlayer;
      this.audioSubscription = this.player.addListener(
        'playbackStatusUpdate',
        status => this.onStatus(status as NativeStatus),
      );
    }
    return this.player;
  }
  private canPlay(): boolean {
    const state = usePlayerStore.getState();
    return (
      state.online &&
      (!state.cellular || useSettingsStore.getState().settings.playOnMobileData)
    );
  }
  async playStation(station: RadioStation) {
    this.initialize();
    if (!station.streamUrl.startsWith('https://')) {
      usePlayerStore.setState({
        status: 'error',
        message: 'Canlı yayın adresi henüz yapılandırılmadı.',
      });
      return;
    }
    // Önceki istasyonun hazırlanmasını ve bekleyen tekrarlarını geçersiz kıl.
    ++this.generation;
    this.clearTimers();
    this.wantsPlayback = true;
    this.attempt = 0;
    this.sourceIndex = 0;
    usePlayerStore.setState({ station, message: undefined });
    if (!this.canPlay()) {
      this.suspendForNetwork();
      return;
    }
    await this.connect();
  }
  private async connect() {
    if (!this.wantsPlayback || !this.canPlay()) {
      return;
    }
    // Ses oturumu henüz hazırlanırken gelen ağ dönüşü isteği kaybolmamalıdır.
    if (this.connecting) {
      this.pendingConnect = true;
      return;
    }
    const station = usePlayerStore.getState().station;
    if (!station) {
      return;
    }
    const sleepAt = usePlayerStore.getState().sleepAt;
    if (sleepAt && sleepAt <= Date.now()) {
      this.pause();
      this.setSleepTimer(undefined);
      return;
    }
    const generation = ++this.generation;
    this.connecting = true;
    this.clearTimers();
    usePlayerStore.setState({
      status: this.attempt ? 'reconnecting' : 'connecting',
      message: this.attempt ? usePlayerStore.getState().message : undefined,
    });
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      if (
        generation !== this.generation ||
        !this.wantsPlayback ||
        !this.canPlay()
      ) {
        return;
      }
      const player = this.ensurePlayer();
      this.ignorePauseUntil = Date.now() + 1000;
      const sources = [
        ...new Set([station.streamUrl, ...(station.fallbackStreamUrls ?? [])]),
      ].filter(url => url.startsWith('https://'));
      player.replace({ uri: sources[this.sourceIndex % sources.length] });
      player.setSleepDeadline(sleepAt ?? 0);
      player.setActiveForLockScreen(
        true,
        { title: station.name, artist: 'Canlı yayın' },
        { showSeekBackward: false, showSeekForward: false },
      );
      player.play();
      // Yüklenmenin sonsuza dek sürmesi durumunda yeniden bağlantı başlatılır.
      this.watchdog = setTimeout(() => this.scheduleRetry(), 20_000);
    } catch {
      usePlayerStore.setState({
        status: 'error',
        message: 'Yayına bağlanılamadı. Tekrar deneniyor…',
      });
      this.scheduleRetry();
    } finally {
      this.connecting = false;
      if (this.pendingConnect) {
        this.pendingConnect = false;
        this.scheduleRetry(true);
      }
    }
  }
  private onStatus(status: NativeStatus) {
    if (status.sleepExpired) {
      if (this.wantsPlayback || usePlayerStore.getState().sleepAt) {
        this.pause();
        usePlayerStore.setState({
          sleepAt: undefined,
          message: 'Uyku zamanlayıcısı yayını durdurdu.',
        });
      }
      return;
    }
    if (status.error || status.didJustFinish) {
      if (this.wantsPlayback) {
        const cause = status.errorCause ?? status.error ?? '';
        const detail = /SSL|Certificate|CertPath|Trust anchor/i.test(cause)
          ? 'Güvenli yayın bağlantısı henüz kurulamadı.'
          : status.errorCode && status.errorCode >= 4000
            ? 'Telefonun ses oynatıcısı yayını başlatamadı.'
            : 'Yayın sunucusundan ses alınamadı.';
        usePlayerStore.setState({ message: `${detail} Yeniden deneniyor…` });
        this.scheduleRetry();
      }
      return;
    }
    // Ağ kesintisi sırasında kendi pause olayımız dinleme isteğini iptal etmez.
    // Kilit ekranı, kulaklık veya ses odağı nedeniyle durdurulduğunda otomatik retry yapılmaz.
    if (
      !status.shouldPlay &&
      this.canPlay() &&
      (this.previousShouldPlay || status.isLoaded) &&
      Date.now() > this.ignorePauseUntil
    ) {
      this.wantsPlayback = false;
      this.clearTimers();
      usePlayerStore.setState({ status: 'paused', message: undefined });
    }
    this.previousShouldPlay = status.shouldPlay;
    if (status.playing && !status.isBuffering) {
      // Kuyrukta kalan eski oynatma olayı, kullanıcının duraklatmasını geri alamaz.
      if (!this.wantsPlayback && !this.player?.playing) {
        return;
      }
      this.wantsPlayback = true; // Kilit ekranından yeniden başlatma.
      if (!this.canPlay()) {
        this.suspendForNetwork();
        return;
      }
      this.attempt = 0;
      this.clearTimers();
      if (
        usePlayerStore.getState().status !== 'playing' ||
        usePlayerStore.getState().message
      ) {
        usePlayerStore.setState({ status: 'playing', message: undefined });
      }
    } else if (status.isBuffering && this.wantsPlayback && !this.retry) {
      usePlayerStore.setState({
        status: this.attempt ? 'reconnecting' : 'buffering',
      });
      if (!this.watchdog) {
        this.watchdog = setTimeout(() => this.scheduleRetry(), 20_000);
      }
    }
  }
  private scheduleRetry(immediate = false) {
    if (!this.wantsPlayback || !this.canPlay() || this.retry) {
      return;
    }
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = undefined;
    }
    usePlayerStore.setState({
      status: 'reconnecting',
      message:
        usePlayerStore.getState().message ?? 'Yayına yeniden bağlanılıyor…',
    });
    // Başarısız denemede yedek adrese geçilir; ağ dönüşünde çalışan adres korunur.
    if (!immediate) {
      this.sourceIndex += 1;
    }
    const delay = immediate ? 0 : reconnectDelay(this.attempt++);
    this.retry = setTimeout(() => {
      this.retry = undefined;
      void this.connect();
    }, delay);
  }
  private onNetwork(network: NetInfoState) {
    const online =
      network.isConnected !== false && network.isInternetReachable !== false;
    const recovered =
      online && (!this.online || this.networkType !== network.type);
    this.online = online;
    this.networkType = network.type;
    usePlayerStore.setState({ online, cellular: network.type === 'cellular' });
    if (!this.canPlay()) {
      if (this.wantsPlayback) {
        this.suspendForNetwork();
      }
      return;
    }
    if (
      recovered &&
      this.wantsPlayback &&
      useSettingsStore.getState().settings.autoResumeAfterNetworkRecovery
    ) {
      this.clearTimers();
      this.scheduleRetry(true);
    }
  }
  private suspendForNetwork() {
    ++this.generation;
    this.clearTimers();
    this.ignorePauseUntil = Date.now() + 1000;
    this.player?.pause();
    this.previousShouldPlay = false;
    const { online } = usePlayerStore.getState();
    usePlayerStore.setState({
      status: 'error',
      message: online
        ? 'Mobil veri ile oynatma kapalı. Wi-Fi bağlantısı bekleniyor…'
        : 'İnternet bağlantısı bekleniyor…',
    });
    if (!useSettingsStore.getState().settings.autoResumeAfterNetworkRecovery) {
      this.wantsPlayback = false;
    }
  }
  pause() {
    this.pendingConnect = false;
    this.wantsPlayback = false;
    ++this.generation;
    this.clearTimers();
    this.player?.pause();
    this.previousShouldPlay = false;
    usePlayerStore.setState({ status: 'paused', message: undefined });
  }
  stop() {
    this.pause();
    this.setSleepTimer(undefined);
    this.player?.setActiveForLockScreen(false);
    this.player?.replace(null);
    usePlayerStore.setState({ status: 'idle', message: undefined });
  }
  setSleepTimer(timestamp: number | undefined) {
    this.ensurePlayer().setSleepDeadline(timestamp ?? 0);
    usePlayerStore.setState({ sleepAt: timestamp });
  }
  updateMetadata(title: string, presenter?: string) {
    this.player?.updateLockScreenMetadata({
      title,
      artist:
        presenter ?? usePlayerStore.getState().station?.name ?? 'Canlı yayın',
    });
  }
  private clearTimers() {
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = undefined;
    }
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = undefined;
    }
  }
  dispose() {
    this.stop();
    this.audioSubscription?.remove();
    this.player?.remove();
    this.player = undefined;
    this.netUnsubscribe?.();
    this.settingsUnsubscribe?.();
    this.appSubscription?.remove();
    this.initialized = false;
    this.connecting = false;
    this.pendingConnect = false;
    this.attempt = 0;
    this.previousShouldPlay = false;
    this.online = true;
    this.networkType = undefined;
  }
}
export const audioPlayer = new AudioPlayerService();
