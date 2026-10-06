import { create } from 'zustand';
import { Platform } from 'react-native';
import { favoritesStorage, remindersStorage } from '../../core/storage';
import { expandProgramIds, programGroup } from '../../utils/programGroups';
import {
  cancelReminder,
  reconcileReminders,
  requestReminderPermission,
} from '../notifications/service';
import { useScheduleStore } from '../schedule/store/scheduleStore';

interface FavoritesState {
  busy: boolean;
  ids: string[];
  reminders: string[];
  toggle: (id: string) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  syncPrograms: () => void;
}
function save(ids: string[], reminders: string[]) {
  favoritesStorage.set(ids);
  remindersStorage.set(reminders);
}
export const useFavoritesStore = create<FavoritesState>((set, get) => {
  // Birden fazla gün kartına hızlı dokunmak izin ve bildirim işlemlerini çakıştırmaz.
  const run = async (action: () => Promise<void>) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await action();
    } finally {
      set({ busy: false });
    }
  };
  const enable = async (group: string[]) => {
    if (!(await requestReminderPermission()))
      throw new Error(
        'Program favoriye eklendi. Otomatik bildirimler için cihaz ayarlarından bildirim izni verin.',
      );
    const reminders = [...new Set([...get().reminders, ...group])];
    if (Platform.OS === 'ios' && reminders.length > 64)
      throw new Error(
        'Bu cihazda en fazla 64 program hatırlatıcısı kurulabilir.',
      );
    const previous = get().reminders;
    save(get().ids, reminders);
    set({ reminders });
    try {
      await reconcileReminders(useScheduleStore.getState().programs);
    } catch (error) {
      save(get().ids, previous);
      set({ reminders: previous });
      await Promise.all(
        group.filter(id => !previous.includes(id)).map(cancelReminder),
      );
      throw error;
    }
  };
  return {
    busy: false,
    ids: favoritesStorage.get(),
    reminders: remindersStorage.get(),
    syncPrograms: () => {
      const programs = useScheduleStore.getState().programs;
      const ids = expandProgramIds(programs, get().ids);
      const reminders = expandProgramIds(programs, get().reminders).filter(id =>
        ids.includes(id),
      );
      save(ids, reminders);
      set({ ids, reminders });
    },
    toggle: id =>
      run(async () => {
        const group = programGroup(useScheduleStore.getState().programs, id);
        if (get().ids.includes(id)) {
          const ids = get().ids.filter(item => !group.includes(item));
          const reminders = get().reminders.filter(
            item => !group.includes(item),
          );
          save(ids, reminders);
          set({ ids, reminders });
          await Promise.all(group.map(cancelReminder));
          await reconcileReminders(useScheduleStore.getState().programs);
        } else {
          // Favori tercihi izin reddedilse de korunur; kurulmamış bildirim açık gösterilmez.
          const ids = [...new Set([...get().ids, ...group])];
          save(ids, get().reminders);
          set({ ids });
          await enable(group);
        }
      }),
    toggleReminder: id =>
      run(async () => {
        const group = programGroup(useScheduleStore.getState().programs, id);
        if (get().reminders.includes(id)) {
          const reminders = get().reminders.filter(
            item => !group.includes(item),
          );
          save(get().ids, reminders);
          set({ reminders });
          await Promise.all(group.map(cancelReminder));
          await reconcileReminders(useScheduleStore.getState().programs);
        } else {
          const ids = [...new Set([...get().ids, ...group])];
          save(ids, get().reminders);
          set({ ids });
          await enable(group);
        }
      }),
  };
});
