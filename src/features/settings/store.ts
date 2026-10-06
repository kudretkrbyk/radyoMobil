import { create } from 'zustand';
import { settingsStorage } from '../../core/storage';
import type { UserSettings } from '../../types';
export const useSettingsStore = create<{
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
}>(set => ({
  settings: settingsStorage.get(),
  update: patch =>
    set(state => {
      const settings = { ...state.settings, ...patch };
      settingsStorage.set(settings);
      return { settings };
    }),
}));
