import bundled from '../../../../assets/data/kafa-radio-schedule.json';
import { scheduleStorage } from '../../../core/storage';
import { parseSchedule } from '../../../utils/schedule';
import type { RadioProgram } from '../../../types';
export interface ScheduleProvider {
  getSchedule(): Promise<RadioProgram[]>;
}
export class LocalScheduleProvider implements ScheduleProvider {
  async getSchedule() {
    return parseSchedule(bundled);
  }
}
const TTL = 6 * 60 * 60 * 1000;
// Veri kaynağı değiştiğinde ekranlar değişmez. Yerel sağlayıcı ağ isteği yapmaz.
export async function loadSchedule(
  provider: ScheduleProvider = new LocalScheduleProvider(),
) {
  const cached = scheduleStorage.get();
  if (cached && Date.now() - cached.lastUpdated < TTL) {
    try {
      return parseSchedule(cached.programSchedule);
    } catch {
      /* Bozuk önbellek paket verisiyle onarılır. */
    }
  }
  try {
    const programs = parseSchedule(await provider.getSchedule());
    scheduleStorage.set(programs);
    return programs;
  } catch {
    return new LocalScheduleProvider().getSchedule();
  }
}
