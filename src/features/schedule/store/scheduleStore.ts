import { create } from 'zustand';
import type { RadioProgram } from '../../../types';
import { loadSchedule } from '../services/ScheduleProvider';
export const useScheduleStore = create<{
  programs: RadioProgram[];
  load: () => Promise<void>;
}>(set => ({
  programs: [],
  load: async () => set({ programs: await loadSchedule() }),
}));
