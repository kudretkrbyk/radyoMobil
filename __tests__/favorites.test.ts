import { useFavoritesStore } from '../src/features/favorites/store';
import { programGroup } from '../src/utils/programGroups';
import bundled from '../assets/data/kafa-radio-schedule.json';
import type { RadioProgram } from '../src/types';
const mockPrograms = bundled as RadioProgram[];
const mockSaved = { ids: [] as string[], reminders: [] as string[] };
const mockPermission = jest.fn(async () => true);
const mockReconcile = jest.fn(async () => {});
const mockCancel = jest.fn<Promise<void>, [string]>(async () => {});
jest.mock('../src/core/storage', () => ({
  favoritesStorage: {
    get: () => mockSaved?.ids ?? [],
    set: (ids: string[]) => {
      mockSaved.ids = ids;
    },
  },
  remindersStorage: {
    get: () => mockSaved?.reminders ?? [],
    set: (ids: string[]) => {
      mockSaved.reminders = ids;
    },
  },
}));
jest.mock('../src/features/schedule/store/scheduleStore', () => ({
  useScheduleStore: { getState: () => ({ programs: mockPrograms }) },
}));
jest.mock('../src/features/notifications/service', () => ({
  requestReminderPermission: () => mockPermission(),
  reconcileReminders: () => mockReconcile(),
  cancelReminder: (id: string) => mockCancel(id),
}));
const nihat = mockPrograms.find(p => p.title === "Nihat'la Sivrisinek")!;
const group = programGroup(mockPrograms, nihat.id);
beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.mockResolvedValue(true);
  mockReconcile.mockResolvedValue(undefined);
  mockSaved.ids = [];
  mockSaved.reminders = [];
  useFavoritesStore.setState({ ids: [], reminders: [], busy: false });
});
test('Nihat’la Sivrisinek tek seçimle tüm yayın günleri için takip edilir ve bildirimler etkinleşir', async () => {
  expect(group).toHaveLength(6);
  await useFavoritesStore.getState().toggle(nihat.id);
  expect(mockSaved.ids).toEqual(group);
  expect(mockSaved.reminders).toEqual(group);
  expect(mockReconcile).toHaveBeenCalledTimes(1);
});
test('başka günün kartından favoriden çıkarmak tüm günlerin bildirimlerini kaldırır', async () => {
  await useFavoritesStore.getState().toggle(nihat.id);
  await useFavoritesStore.getState().toggle(group[1]);
  expect(mockSaved.ids).toEqual([]);
  expect(mockSaved.reminders).toEqual([]);
  group.forEach(id => expect(mockCancel).toHaveBeenCalledWith(id));
});
test('bildirim izni reddedilince favori korunur ama kurulmamış bildirimler açık gösterilmez', async () => {
  mockPermission.mockResolvedValue(false);
  await expect(useFavoritesStore.getState().toggle(nihat.id)).rejects.toThrow(
    'bildirim izni',
  );
  expect(mockSaved.ids).toEqual(group);
  expect(mockSaved.reminders).toEqual([]);
  expect(mockReconcile).not.toHaveBeenCalled();
});
test('native bildirim kurulum hatasında grup hatırlatıcıları geri alınır', async () => {
  mockReconcile.mockRejectedValueOnce(new Error('native error'));
  await expect(useFavoritesStore.getState().toggle(nihat.id)).rejects.toThrow();
  expect(mockSaved.ids).toEqual(group);
  expect(mockSaved.reminders).toEqual([]);
  group.forEach(id => expect(mockCancel).toHaveBeenCalledWith(id));
});
test('eski sürümde tek gün takip edilen program açılışta diğer günlere genişletilir', () => {
  useFavoritesStore.setState({ ids: [nihat.id], reminders: [nihat.id] });
  useFavoritesStore.getState().syncPrograms();
  expect(mockSaved.ids).toEqual(group);
  expect(mockSaved.reminders).toEqual(group);
});
test('aynı isim başka radyoda geçiyorsa birlikte favoriye eklenmez', () => {
  const other = { ...nihat, id: 'other', stationId: 'other-station' };
  expect(programGroup([...mockPrograms, other], nihat.id)).not.toContain(
    other.id,
  );
});
test('hatırlatıcı kapatmak tüm günleri kapatır, favori tercihini korur', async () => {
  await useFavoritesStore.getState().toggle(nihat.id);
  await useFavoritesStore.getState().toggleReminder(group[2]);
  expect(mockSaved.ids).toEqual(group);
  expect(mockSaved.reminders).toEqual([]);
});
