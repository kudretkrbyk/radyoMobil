import bundled from '../assets/data/kafa-radio-schedule.json';
import {
  scheduleReminder,
  reconcileReminders,
  cancelReminder,
} from '../src/features/notifications/service';
import type { RadioProgram } from '../src/types';
const mockCreate = jest.fn(async () => {});
const mockCancel = jest.fn(async () => {});
const mockSettings = jest.fn(async () => ({
  authorizationStatus: 1,
  android: { alarm: 1 },
}));
const mockFavorites = { ids: ['morning'], reminders: ['morning'] };
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createTriggerNotification: (...args: unknown[]) =>
      mockCreate(...(args as [])),
    cancelNotification: (...args: unknown[]) => mockCancel(...(args as [])),
    getNotificationSettings: () => mockSettings(),
    getChannel: async () => ({ blocked: false }),
    getTriggerNotificationIds: async () => [
      'program-old',
      'program-morning',
      'media-player',
    ],
  },
  AndroidImportance: { DEFAULT: 3 },
  AuthorizationStatus: { AUTHORIZED: 1 },
  RepeatFrequency: { WEEKLY: 2 },
  TriggerType: { TIMESTAMP: 0 },
  AndroidNotificationSetting: { ENABLED: 1 },
  AlarmType: { SET_EXACT_AND_ALLOW_WHILE_IDLE: 3 },
}));
jest.mock('../src/core/storage', () => ({
  favoritesStorage: { get: () => mockFavorites.ids },
  remindersStorage: { get: () => mockFavorites.reminders },
  settingsStorage: { get: () => ({ notificationLeadMinutes: 5 }) },
  pendingNotificationStorage: { get: () => null, set: jest.fn() },
}));
const program: RadioProgram = {
  id: 'morning',
  stationId: 'test',
  title: 'Sabah programı',
  presenter: 'Sunucu',
  dayOfWeek: 1,
  startTime: '07:00',
  endTime: '09:00',
};
beforeEach(() => {
  mockFavorites.ids = ['morning'];
  mockFavorites.reminders = ['morning'];
  jest.clearAllMocks();
  mockSettings.mockResolvedValue({
    authorizationStatus: 1,
    android: { alarm: 1 },
  });
});
test('bildirim Türkçe içerikle haftalık native tetikleyici olarak kurulur', async () => {
  await scheduleReminder(program, 5);
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Sabah programı birazdan başlıyor',
      data: { programId: 'morning', stationId: 'test' },
    }),
    expect.objectContaining({
      type: 0,
      repeatFrequency: 2,
      timestamp: expect.any(Number),
    }),
  );
});
test('favoriden çıkarılan bildirimi iptal ederken medya bildirimi korunur', async () => {
  await reconcileReminders([program]);
  expect(mockCancel).toHaveBeenCalledWith('program-old');
  expect(mockCancel).not.toHaveBeenCalledWith('media-player');
});
test('bildirim izni verilmeden tetikleyici kurulmaz', async () => {
  mockSettings.mockResolvedValue({
    authorizationStatus: 0,
    android: { alarm: 0 },
  });
  await expect(scheduleReminder(program, 5)).rejects.toThrow();
  expect(mockCreate).not.toHaveBeenCalled();
});
test('program kimliği üzerinden doğru bildirim iptal edilir', async () => {
  await cancelReminder('morning');
  expect(mockCancel).toHaveBeenCalledWith('program-morning');
});

test('Nihat’la Sivrisinek takibinin her yayın günü için ayrı haftalık bildirim oluşur', async () => {
  const programs = (bundled as RadioProgram[]).filter(
    p => p.title === "Nihat'la Sivrisinek",
  );
  mockFavorites.ids = programs.map(p => p.id);
  mockFavorites.reminders = [...mockFavorites.ids];
  await reconcileReminders(programs);
  expect(mockCreate).toHaveBeenCalledTimes(programs.length);
  for (const program of programs) {
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `program-${program.id}`,
        data: { programId: program.id, stationId: program.stationId },
      }),
      expect.objectContaining({
        repeatFrequency: 2,
        timestamp: expect.any(Number),
      }),
    );
  }
});
