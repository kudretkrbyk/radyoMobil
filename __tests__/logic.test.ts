import bundled from '../assets/data/kafa-radio-schedule.json';
import {
  getCurrentProgram,
  getNextProgram,
  getCurrentOccurrence,
  parseSchedule,
  notificationTimestamp,
  sleepDeadline,
  istanbulDay,
} from '../src/utils/schedule';
import { reconnectDelay } from '../src/utils/backoff';
import { toggleFavorite } from '../src/utils/favorites';
import type { RadioProgram } from '../src/types';

const morning: RadioProgram = {
  id: 'morning',
  stationId: 'test',
  title: 'Sabah programı',
  dayOfWeek: 1,
  startTime: '07:00',
  endTime: '09:00',
};
const night: RadioProgram = {
  ...morning,
  id: 'night',
  title: 'Gece programı',
  dayOfWeek: 0,
  startTime: '22:00',
  endTime: '01:00',
};
const monday = new Date('2026-10-05T04:00:00Z'); // İstanbul'da pazartesi 07:00.

describe('İstanbul yayın akışı', () => {
  test('resmî siteden paketlenen tüm kayıtlar geçerlidir', () =>
    expect(parseSchedule(bundled)).toHaveLength(84));
  test('cihaz saatinden bağımsız İstanbul gününü bulur', () =>
    expect(istanbulDay(new Date('2026-10-04T22:00:00Z'))).toBe(1));
  test('başlangıç anı programa dahildir', () =>
    expect(getCurrentProgram([morning], monday)?.id).toBe('morning'));
  test('bitiş anı programa dahil değildir', () =>
    expect(
      getCurrentProgram([morning], new Date('2026-10-05T06:00:00Z')),
    ).toBeUndefined());
  test('önceki günden devam eden program bulunur', () =>
    expect(
      getCurrentProgram([night], new Date('2026-10-04T21:30:00Z'))?.id,
    ).toBe('night'));
  test('gece yarısını aşan programın bitiş tarihi doğrudur', () =>
    expect(
      getCurrentOccurrence(
        [night],
        new Date('2026-10-04T21:30:00Z'),
      )?.end.toISOString(),
    ).toBe('2026-10-04T22:00:00.000Z'));
  test('hafta sınırını aşarak sonraki programı bulur', () =>
    expect(
      getNextProgram(
        [morning],
        new Date('2026-10-05T06:00:00Z'),
      )?.start.toISOString(),
    ).toBe('2026-10-12T04:00:00.000Z'));
  test('boş akış hata üretmez', () => {
    expect(getCurrentProgram([], monday)).toBeUndefined();
    expect(getNextProgram([], monday)).toBeUndefined();
  });
  test.each(['24:00', '7:00', '07:60', 'abc'])(
    'geçersiz saati reddeder: %s',
    startTime =>
      expect(() => parseSchedule([{ ...morning, startTime }])).toThrow(),
  );
  test('yinelenen kimlik reddedilir', () =>
    expect(() => parseSchedule([morning, morning])).toThrow());
  test('geçersiz gün reddedilir', () =>
    expect(() => parseSchedule([{ ...morning, dayOfWeek: 7 }])).toThrow());
  test('liste olmayan veri reddedilir', () =>
    expect(() => parseSchedule(null)).toThrow());
  test('sıfır süreli program reddedilir', () =>
    expect(() => parseSchedule([{ ...morning, endTime: '07:00' }])).toThrow());
});
describe('Yerel bildirim ve uyku zamanı', () => {
  test.each([0, 5, 10, 15])('%i dakika önce doğru zaman hesaplanır', lead => {
    expect(
      notificationTimestamp(morning, lead, new Date('2026-10-04T12:00:00Z')),
    ).toBe(monday.getTime() - lead * 60_000);
  });
  test('bildirim anı geçtiyse gelecek haftaya kurulur', () =>
    expect(
      notificationTimestamp(morning, 5, new Date('2026-10-05T03:56:00Z')),
    ).toBe(new Date('2026-10-12T03:55:00Z').getTime()));
  test('pazartesi 00:00 bildirimi pazar gecesine düşebilir', () =>
    expect(
      notificationTimestamp(
        { ...morning, startTime: '00:00' },
        15,
        new Date('2026-10-04T12:00:00Z'),
      ),
    ).toBe(new Date('2026-10-04T20:45:00Z').getTime()));
  test.each([15, 30, 45, 60, 90])(
    '%i dakikalık uyku süresi doğrudur',
    minutes =>
      expect(sleepDeadline(minutes, 1000)).toBe(1000 + minutes * 60_000),
  );
  test('geçersiz uyku süresi reddedilir', () =>
    expect(() => sleepDeadline(-1)).toThrow());
  test('geçersiz bildirim süresi reddedilir', () =>
    expect(() => notificationTimestamp(morning, 20)).toThrow());
});
describe('Favoriler ve yeniden bağlanma', () => {
  test('ekleme ve çıkarma mevcut listeyi değiştirmez', () => {
    const ids = ['a'];
    expect(toggleFavorite(ids, 'b')).toEqual(['a', 'b']);
    expect(toggleFavorite(ids, 'a')).toEqual([]);
    expect(ids).toEqual(['a']);
  });
  test('tekrarlı kimlik eklenmez', () =>
    expect(toggleFavorite(['a', 'a'], 'b')).toEqual(['a', 'b']));
  test('üstel bekleme ve üst sınır', () =>
    expect([0, 1, 2, 3, 4, 5, 6, 100].map(reconnectDelay)).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]));
});
