import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  favoritesStorage,
  pendingNotificationStorage,
  remindersStorage,
  settingsStorage,
} from '../../core/storage';
import type { RadioProgram } from '../../types';
import { notificationTimestamp } from '../../utils/schedule';

const CHANNEL = 'program-hatirlaticilari';
const PREFIX = 'program-';
export function rememberNotification(programId: string) {
  pendingNotificationStorage.set(programId);
}
export function takeNotification() {
  const id = pendingNotificationStorage.get();
  pendingNotificationStorage.set(null);
  return id;
}
export async function requestReminderPermission(): Promise<boolean> {
  const permission = await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL,
    name: 'Program hatırlatıcıları',
    importance: AndroidImportance.DEFAULT,
  });
  return permission.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

// Android ve iOS tetikleyicileri işletim sistemine teslim edilir; uygulamanın açık olması gerekmez.
export async function scheduleReminder(program: RadioProgram, lead: number) {
  const permission = await notifee.getNotificationSettings();
  if (permission.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    throw new Error('Program hatırlatıcıları için bildirim iznini açın.');
  }
  if (
    Platform.OS === 'android' &&
    (await notifee.getChannel(CHANNEL))?.blocked
  ) {
    throw new Error('Program hatırlatıcıları bildirim kanalını açın.');
  }
  const timestamp = notificationTimestamp(program, lead);
  await notifee.createTriggerNotification(
    {
      id: PREFIX + program.id,
      title:
        lead === 0
          ? `${program.title} başlıyor`
          : `${program.title} birazdan başlıyor`,
      body: `${program.startTime} · ${program.presenter ?? 'Kafa Radyo'}${lead ? ` · ${lead} dakika kaldı` : ''}`,
      data: { programId: program.id, stationId: program.stationId },
      android: {
        channelId: CHANNEL,
        smallIcon: 'ic_stat_radio',
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          banner: true,
          list: true,
          sound: true,
        },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: RepeatFrequency.WEEKLY,
      // Kesin alarm izni verilmediyse sistemin normal zamanlayıcısı kullanılır.
      ...(Platform.OS === 'android' &&
      permission.android.alarm === AndroidNotificationSetting.ENABLED
        ? { alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE } }
        : {}),
    },
  );
}
export async function cancelReminder(programId: string) {
  await notifee.cancelNotification(PREFIX + programId);
}

// Açılışta ve saat/ayar değişiminde sadece hatırlatıcılar eşitlenir; medya bildirimi silinmez.
let queue: Promise<void> = Promise.resolve();
export function reconcileReminders(programs: RadioProgram[]): Promise<void> {
  queue = queue
    .catch(() => {})
    .then(async () => {
      const favorites = favoritesStorage.get();
      const ids = remindersStorage.get().filter(id => favorites.includes(id));
      const existing = await notifee.getTriggerNotificationIds();
      await Promise.all(
        existing
          .filter(
            id =>
              id.startsWith(PREFIX) && !ids.includes(id.slice(PREFIX.length)),
          )
          .map(id => notifee.cancelNotification(id)),
      );
      const lead = settingsStorage.get().notificationLeadMinutes;
      for (const id of ids) {
        const program = programs.find(item => item.id === id);
        if (program) {
          await scheduleReminder(program, lead);
        } else {
          await cancelReminder(id);
        }
      }
    });
  return queue;
}
