import { setAudioModeAsync, type AudioStatus } from 'expo-audio';
import { audioPlayer } from '../src/core/audio/AudioPlayerService';
import { usePlayerStore } from '../src/features/player/store/playerStore';
import { useSettingsStore } from '../src/features/settings/store';
import { defaultStation } from '../src/data/stations';

let mockListener: (
  status: Partial<AudioStatus> & {
    shouldPlay?: boolean;
    sleepExpired?: boolean;
  },
) => void;
const mockNative = {
  play: jest.fn(),
  pause: jest.fn(),
  replace: jest.fn(),
  remove: jest.fn(),
  setActiveForLockScreen: jest.fn(),
  updateLockScreenMetadata: jest.fn(),
  setSleepDeadline: jest.fn(),
  playing: false,
  addListener: jest.fn((_event, callback) => {
    mockListener = callback;
    return { remove: jest.fn() };
  }),
};
let mockNetwork: (state: unknown) => void;
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => mockNative,
  setAudioModeAsync: jest.fn(async () => {}),
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    addEventListener: (callback: (state: unknown) => void) => {
      mockNetwork = callback;
      return jest.fn();
    },
  },
}));
jest.mock('../src/core/storage', () => ({
  settingsStorage: {
    get: () => ({
      playOnMobileData: true,
      autoResumeAfterNetworkRecovery: true,
      autoPlayFromNotification: false,
      notificationLeadMinutes: 5,
      theme: 'system',
    }),
    set: jest.fn(),
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  usePlayerStore.setState({
    status: 'idle',
    station: undefined,
    online: true,
    cellular: false,
    sleepAt: undefined,
  });
  useSettingsStore
    .getState()
    .update({ playOnMobileData: true, autoResumeAfterNetworkRecovery: true });
});
afterEach(() => {
  audioPlayer.dispose();
  jest.useRealTimers();
});

test('yayımlama native kilit ekranını etkinleştirir', async () => {
  await audioPlayer.playStation(defaultStation);
  expect(mockNative.replace).toHaveBeenCalledWith({
    uri: defaultStation.streamUrl,
  });
  expect(mockNative.setActiveForLockScreen).toHaveBeenCalledWith(
    true,
    expect.any(Object),
    expect.any(Object),
  );
  expect(mockNative.play).toHaveBeenCalledTimes(1);
});
test('kullanıcının duraklatması bekleyen yeniden bağlantıyı iptal eder', async () => {
  await audioPlayer.playStation(defaultStation);
  mockListener({ error: 'test', shouldPlay: true });
  expect(usePlayerStore.getState().status).toBe('reconnecting');
  audioPlayer.pause();
  await jest.advanceTimersByTimeAsync(60_000);
  expect(mockNative.play).toHaveBeenCalledTimes(1);
  expect(usePlayerStore.getState().status).toBe('paused');
});
test('internet dönünce kullanıcı yeniden dokunmadan oynatılır', async () => {
  await audioPlayer.playStation(defaultStation);
  mockNetwork({ isConnected: false, isInternetReachable: false, type: 'none' });
  mockNetwork({ isConnected: true, isInternetReachable: true, type: 'wifi' });
  await jest.advanceTimersByTimeAsync(1);
  expect(mockNative.play).toHaveBeenCalledTimes(2);
});
test('mobil veri kapalıysa oynatma başlamaz', async () => {
  audioPlayer.initialize();
  useSettingsStore.getState().update({ playOnMobileData: false });
  mockNetwork({
    isConnected: true,
    isInternetReachable: true,
    type: 'cellular',
  });
  await audioPlayer.playStation(defaultStation);
  expect(mockNative.play).not.toHaveBeenCalled();
});
test('otomatik devam kapalıysa internet dönüşünde başlamaz', async () => {
  useSettingsStore.getState().update({ autoResumeAfterNetworkRecovery: false });
  await audioPlayer.playStation(defaultStation);
  mockNetwork({ isConnected: false, isInternetReachable: false, type: 'none' });
  mockNetwork({ isConnected: true, isInternetReachable: true, type: 'wifi' });
  await jest.advanceTimersByTimeAsync(60_000);
  expect(mockNative.play).toHaveBeenCalledTimes(1);
});
test('uyku zamanı native katmana teslim edilir ve süresi dolunca retry yapılmaz', async () => {
  await audioPlayer.playStation(defaultStation);
  const deadline = Date.now() + 30 * 60_000;
  audioPlayer.setSleepTimer(deadline);
  expect(mockNative.setSleepDeadline).toHaveBeenLastCalledWith(deadline);
  mockListener({ sleepExpired: true });
  await jest.advanceTimersByTimeAsync(60_000);
  expect(usePlayerStore.getState().sleepAt).toBeUndefined();
  expect(mockNative.play).toHaveBeenCalledTimes(1);
});

test('yükleme sırasında verilen kilit ekranı duraklatması tekrar oynatılmaz', async () => {
  await audioPlayer.playStation(defaultStation);
  mockListener({
    shouldPlay: false,
    playing: false,
    isLoaded: true,
    isBuffering: false,
  });
  await jest.advanceTimersByTimeAsync(1100);
  mockListener({
    shouldPlay: false,
    playing: false,
    isLoaded: true,
    isBuffering: false,
  });
  await jest.advanceTimersByTimeAsync(60_000);
  expect(mockNative.play).toHaveBeenCalledTimes(1);
  expect(usePlayerStore.getState().status).toBe('paused');
});

test('çevrimdışı dinleme isteği ekranda iptal edilebilir ve ağ dönünce başlamaz', async () => {
  await audioPlayer.playStation(defaultStation);
  mockNetwork({ isConnected: false, isInternetReachable: false, type: 'none' });
  expect(usePlayerStore.getState().wantsPlayback).toBe(true);
  audioPlayer.pause();
  expect(usePlayerStore.getState().wantsPlayback).toBe(false);
  mockNetwork({ isConnected: true, isInternetReachable: true, type: 'wifi' });
  await jest.advanceTimersByTimeAsync(60_000);
  expect(mockNative.play).toHaveBeenCalledTimes(1);
});

test('ses oturumu hazırlanırken internet gidip gelirse yeniden bağlantı kaybolmaz', async () => {
  let release!: () => void;
  jest.mocked(setAudioModeAsync).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  const starting = audioPlayer.playStation(defaultStation);
  mockNetwork({ isConnected: false, isInternetReachable: false, type: 'none' });
  mockNetwork({ isConnected: true, isInternetReachable: true, type: 'wifi' });
  await jest.advanceTimersByTimeAsync(1);
  release();
  await starting;
  await jest.advanceTimersByTimeAsync(1);
  expect(mockNative.play).toHaveBeenCalledTimes(1);
});

test('ses oturumu hazırlanırken kullanıcı duraklatırsa ağ dönüşü yayını başlatmaz', async () => {
  let release!: () => void;
  jest.mocked(setAudioModeAsync).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  const starting = audioPlayer.playStation(defaultStation);
  mockNetwork({ isConnected: false, isInternetReachable: false, type: 'none' });
  mockNetwork({ isConnected: true, isInternetReachable: true, type: 'wifi' });
  await jest.advanceTimersByTimeAsync(1);
  audioPlayer.pause();
  release();
  await starting;
  await jest.advanceTimersByTimeAsync(60_000);
  expect(mockNative.play).not.toHaveBeenCalled();
});

test('ana yayın bağlantısı başarısız olursa yedek adres denenir', async () => {
  await audioPlayer.playStation(defaultStation);
  mockListener({ error: 'Source error', shouldPlay: true });
  await jest.advanceTimersByTimeAsync(1001);
  expect(mockNative.replace).toHaveBeenLastCalledWith({
    uri: defaultStation.fallbackStreamUrls![0],
  });
  expect(usePlayerStore.getState().message).toContain('ses alınamadı');
});

test('ağ nedeniyle verilen duraklatma olayları otomatik devam isteğini silmez', async () => {
  await audioPlayer.playStation(defaultStation);
  mockNetwork({ isConnected: false, isInternetReachable: false, type: 'none' });
  await jest.advanceTimersByTimeAsync(5000);
  mockListener({ shouldPlay: false, isLoaded: true, playing: false });
  expect(usePlayerStore.getState().status).toBe('error');
  mockNetwork({ isConnected: true, isInternetReachable: true, type: 'wifi' });
  await jest.advanceTimersByTimeAsync(1);
  expect(mockNative.play).toHaveBeenCalledTimes(2);
});

test('istasyon değişince eski kaynağın bekleyen tekrar isteği iptal edilir', async () => {
  await audioPlayer.playStation(defaultStation);
  mockListener({ error: 'Source error', shouldPlay: true });
  const other = {
    id: 'ikinci',
    name: 'İkinci Radyo',
    streamUrl: 'https://example.com/live.m3u8',
  };
  await audioPlayer.playStation(other);
  await jest.advanceTimersByTimeAsync(1001);
  expect(mockNative.replace).toHaveBeenLastCalledWith({ uri: other.streamUrl });
  expect(mockNative.play).toHaveBeenCalledTimes(2);
  expect(usePlayerStore.getState().station?.id).toBe(other.id);
});

test('ilk istasyon hazırlanırken değiştirilirse sadece son seçilen yayın başlar', async () => {
  let release!: () => void;
  jest.mocked(setAudioModeAsync).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  const starting = audioPlayer.playStation(defaultStation);
  const other = {
    id: 'ikinci',
    name: 'İkinci Radyo',
    streamUrl: 'https://example.com/live.m3u8',
  };
  await audioPlayer.playStation(other);
  release();
  await starting;
  await jest.advanceTimersByTimeAsync(1);
  expect(mockNative.replace).toHaveBeenCalledTimes(1);
  expect(mockNative.replace).toHaveBeenCalledWith({ uri: other.streamUrl });
});
