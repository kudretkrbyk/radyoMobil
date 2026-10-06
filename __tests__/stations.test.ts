import {
  restoreRadioList,
  useStationsStore,
} from '../src/features/stations/store';
import { stations } from '../src/data/stations';
let mockRadioSaved: unknown = null;
jest.mock('../src/core/storage', () => ({
  radioListStorage: {
    get: () => mockRadioSaved,
    set: (value: unknown) => {
      mockRadioSaved = value;
    },
  },
}));
beforeEach(() => {
  mockRadioSaved = null;
  useStationsStore.setState({ custom: [], hidden: [], radios: stations });
});
test('özel radyo eklenir, hazır radyo çıkarılır ve tekrar yüklemede her iki tercih korunur', () => {
  useStationsStore
    .getState()
    .add('Benim radyom', 'https://example.com/live.m3u8');
  useStationsStore.getState().remove(stations[0].id);
  const saved = restoreRadioList(mockRadioSaved);
  expect(saved.custom[0].name).toBe('Benim radyom');
  expect(saved.hidden).toContain(stations[0].id);
  jest.isolateModules(() => {
    const restored =
      require('../src/features/stations/store').useStationsStore.getState();
    expect(
      restored.radios.some((s: { id: string }) => s.id === stations[0].id),
    ).toBe(false);
    expect(
      restored.radios.some((s: { name: string }) => s.name === 'Benim radyom'),
    ).toBe(true);
  });
});
test('özel radyo listeden çıkarılınca kalıcı kaydı silinir', () => {
  useStationsStore.getState().add('Radyo', 'https://example.com/live');
  useStationsStore.getState().remove(useStationsStore.getState().custom[0].id);
  expect(restoreRadioList(mockRadioSaved).custom).toEqual([]);
});
test.each([
  '',
  'http://example.com/live',
  'javascript:alert(1)',
  'https://user:pass@example.com/live',
])('geçersiz yayın adresi kaydedilmez: %s', url => {
  expect(() => useStationsStore.getState().add('Radyo', url)).toThrow();
  expect(mockRadioSaved).toBeNull();
});
test('yinelenen yayın adresi ikinci kez eklenmez', () => {
  useStationsStore.getState().add('Radyo', 'https://example.com/live');
  expect(() =>
    useStationsStore.getState().add('Diğer', 'https://example.com/live'),
  ).toThrow('zaten var');
});
test('bozuk liste kaydı hazır radyoları yüklemeyi engellemez', () => {
  expect(
    restoreRadioList({
      custom: [null, {}, { id: 'custom-a', name: 'X', streamUrl: 'invalid' }],
      hidden: 'broken',
    }),
  ).toEqual({ custom: [], hidden: [] });
});

test('hazır radyo yeniden eklenebilir ve silinmiş kaydı kaldırılır', () => {
  useStationsStore.getState().remove(stations[0].id);
  useStationsStore.getState().restore(stations[0].id);
  expect(restoreRadioList(mockRadioSaved).hidden).not.toContain(stations[0].id);
  expect(
    useStationsStore.getState().radios.some(s => s.id === stations[0].id),
  ).toBe(true);
});
