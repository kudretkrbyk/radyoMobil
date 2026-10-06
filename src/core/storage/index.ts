import { createMMKV } from 'react-native-mmkv';
import type { RadioProgram, UserSettings } from '../../types';

// Tek yerel depolama sınırı: ekranlar native depolama API'sine erişmez.
const storage = createMMKV({ id: 'radyo-mobil' });
function read<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}
export const defaultSettings: UserSettings = {
  playOnMobileData: true,
  notificationLeadMinutes: 5,
  autoPlayFromNotification: false,
  autoResumeAfterNetworkRecovery: true,
  theme: 'system',
};
export const settingsStorage = {
  get: (): UserSettings => {
    const raw = read<unknown>('settings', {});
    const value =
      raw && typeof raw === 'object' ? (raw as Partial<UserSettings>) : {};
    return {
      playOnMobileData:
        typeof value.playOnMobileData === 'boolean'
          ? value.playOnMobileData
          : true,
      notificationLeadMinutes: [0, 5, 10, 15].includes(
        value.notificationLeadMinutes ?? -1,
      )
        ? value.notificationLeadMinutes!
        : 5,
      autoPlayFromNotification: value.autoPlayFromNotification === true,
      autoResumeAfterNetworkRecovery:
        value.autoResumeAfterNetworkRecovery !== false,
      theme: ['system', 'light', 'dark'].includes(value.theme ?? '')
        ? value.theme!
        : 'system',
    };
  },
  set: (value: UserSettings) => write('settings', value),
};
export const favoritesStorage = {
  get: (): string[] => {
    const value = read<unknown>('favorites', []);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string')
      : [];
  },
  set: (value: string[]) => write('favorites', value),
};
export const remindersStorage = {
  get: (): string[] => {
    const value = read<unknown>('reminders', []);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string')
      : [];
  },
  set: (value: string[]) => write('reminders', value),
};
export const scheduleStorage = {
  get: () =>
    read<{ programSchedule: RadioProgram[]; lastUpdated: number } | null>(
      'schedule',
      null,
    ),
  set: (programSchedule: RadioProgram[]) =>
    write('schedule', { programSchedule, lastUpdated: Date.now() }),
};
export const pendingNotificationStorage = {
  get: () => read<string | null>('pendingNotification', null),
  set: (value: string | null) => write('pendingNotification', value),
};

// Hazır listeden çıkarılanlar ayrı tutulur; güncelleme silinen radyoları geri eklemez.
export const radioListStorage = {
  get: () => read<unknown>('radio-list', null),
  set: (value: unknown) => write('radio-list', value),
};
