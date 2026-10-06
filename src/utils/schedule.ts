import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { RadioProgram } from '../types';

export const TIME_ZONE = 'Europe/Istanbul';
export const dayNames = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parseSchedule(value: unknown): RadioProgram[] {
  if (!Array.isArray(value)) {
    throw new Error('Program akışı bir liste olmalıdır.');
  }
  const ids = new Set<string>();
  return value.map((row: RadioProgram) => {
    if (
      !row ||
      typeof row.id !== 'string' ||
      !row.id ||
      ids.has(row.id) ||
      typeof row.stationId !== 'string' ||
      !row.stationId ||
      typeof row.title !== 'string' ||
      !row.title ||
      (row.presenter !== undefined && typeof row.presenter !== 'string') ||
      !Number.isInteger(row.dayOfWeek) ||
      row.dayOfWeek < 0 ||
      row.dayOfWeek > 6 ||
      typeof row.startTime !== 'string' ||
      typeof row.endTime !== 'string' ||
      !timePattern.test(row.startTime) ||
      !timePattern.test(row.endTime) ||
      row.startTime === row.endTime
    ) {
      throw new Error('Program akışında geçersiz veya yinelenen kayıt var.');
    }
    ids.add(row.id);
    return { ...row };
  });
}

// Önce İstanbul takvim gününü buluruz; cihazın saat dilimi sonucu değiştirmez.
export function istanbulDay(date: Date): number {
  const local = formatInTimeZone(date, TIME_ZONE, 'yyyy-MM-dd');
  return new Date(local + 'T12:00:00Z').getUTCDay();
}
function localDateOffset(date: Date, offset: number): string {
  const local = new Date(
    formatInTimeZone(date, TIME_ZONE, 'yyyy-MM-dd') + 'T12:00:00Z',
  );
  local.setUTCDate(local.getUTCDate() + offset);
  return local.toISOString().slice(0, 10);
}
export function occurrence(
  program: RadioProgram,
  now: Date,
  dayOffset: number,
) {
  const start = fromZonedTime(
    `${localDateOffset(now, dayOffset)}T${program.startTime}:00`,
    TIME_ZONE,
  );
  // Gece yarısını aşan programın bitişi sonraki takvim günündedir.
  const endOffset = dayOffset + (program.endTime < program.startTime ? 1 : 0);
  const end = fromZonedTime(
    `${localDateOffset(now, endOffset)}T${program.endTime}:00`,
    TIME_ZONE,
  );
  return { program, start, end };
}
export function getCurrentOccurrence(
  schedule: RadioProgram[],
  now = new Date(),
) {
  const day = istanbulDay(now);
  return (
    [-1, 0]
      .flatMap(offset =>
        schedule
          .filter(p => p.dayOfWeek === (day + offset + 7) % 7)
          .map(p => occurrence(p, now, offset)),
      )
      .filter(item => item.start <= now && now < item.end)
      // Resmî akış çakışırsa en geç başlayan kaydı seçeriz.
      .sort((a, b) => b.start.getTime() - a.start.getTime())[0]
  );
}
export function getCurrentProgram(schedule: RadioProgram[], now = new Date()) {
  return getCurrentOccurrence(schedule, now)?.program;
}
export function getNextProgram(schedule: RadioProgram[], now = new Date()) {
  const day = istanbulDay(now);
  return Array.from({ length: 8 }, (_, offset) =>
    schedule
      .filter(p => p.dayOfWeek === (day + offset) % 7)
      .map(p => occurrence(p, now, offset)),
  )
    .flat()
    .filter(item => item.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
}
export function notificationTimestamp(
  program: RadioProgram,
  leadMinutes: number,
  now = new Date(),
): number {
  if (![0, 5, 10, 15].includes(leadMinutes)) {
    throw new Error('Geçersiz bildirim süresi.');
  }
  const offset = (program.dayOfWeek - istanbulDay(now) + 7) % 7;
  let timestamp =
    occurrence(program, now, offset).start.getTime() - leadMinutes * 60_000;
  // Bildirim saati geçtiyse geçmişe bildirim kurmak yerine gelecek haftaya geçilir.
  if (timestamp <= now.getTime()) {
    timestamp =
      occurrence(program, now, offset + 7).start.getTime() -
      leadMinutes * 60_000;
  }
  return timestamp;
}
export function sleepDeadline(minutes: number, now = Date.now()): number {
  if (![15, 30, 45, 60, 90].includes(minutes)) {
    throw new Error('Geçersiz uyku süresi.');
  }
  return now + minutes * 60_000;
}
