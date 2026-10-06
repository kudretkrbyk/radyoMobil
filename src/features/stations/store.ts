import { create } from 'zustand';
import { stations } from '../../data/stations';
import { radioListStorage } from '../../core/storage';
import type { RadioStation } from '../../types';

export function normalizeStreamUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.toString();
  } catch {
    throw new Error(
      'HTTPS ile başlayan doğrudan canlı yayın adresini girin. Radyo web sitesinin adresi yeterli değildir.',
    );
  }
}
interface SavedRadios {
  custom: RadioStation[];
  hidden: string[];
}
export function restoreRadioList(raw: unknown): SavedRadios {
  const value =
    raw && typeof raw === 'object' ? (raw as Partial<SavedRadios>) : {};
  const custom: RadioStation[] = [];
  if (Array.isArray(value.custom)) {
    for (const item of value.custom) {
      if (
        !item ||
        typeof item.id !== 'string' ||
        !item.id.startsWith('custom-') ||
        typeof item.name !== 'string' ||
        !item.name.trim() ||
        typeof item.streamUrl !== 'string'
      )
        continue;
      try {
        const streamUrl = normalizeStreamUrl(item.streamUrl);
        if (!custom.some(s => s.id === item.id || s.streamUrl === streamUrl))
          custom.push({ id: item.id, name: item.name.trim(), streamUrl });
      } catch {
        /* Bozuk kayıtlar diğer radyoların yüklenmesini engellemez. */
      }
    }
  }
  const hidden = Array.isArray(value.hidden)
    ? value.hidden.filter((id): id is string => typeof id === 'string')
    : [];
  return { custom, hidden };
}
const saved = restoreRadioList(radioListStorage.get());
export const useStationsStore = create<
  SavedRadios & {
    radios: RadioStation[];
    add: (name: string, url: string) => void;
    remove: (id: string) => void;
    restore: (id: string) => void;
  }
>((set, get) => ({
  ...saved,
  radios: [
    ...stations.filter(s => !saved.hidden.includes(s.id)),
    ...saved.custom,
  ],
  add: (name, url) => {
    name = name.trim();
    if (!name || name.length > 80)
      throw new Error('1 ile 80 karakter arasında bir radyo adı girin.');
    const streamUrl = normalizeStreamUrl(url);
    if (get().radios.some(s => normalizeStreamUrl(s.streamUrl) === streamUrl))
      throw new Error('Bu yayın adresi radyo listenizde zaten var.');
    const radio = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      streamUrl,
    };
    const custom = [...get().custom, radio];
    radioListStorage.set({ custom, hidden: get().hidden });
    set({ custom, radios: [...get().radios, radio] });
  },
  restore: id => {
    const radio = stations.find(s => s.id === id);
    if (!radio || get().radios.some(s => s.id === id)) return;
    const hidden = get().hidden.filter(item => item !== id);
    radioListStorage.set({ custom: get().custom, hidden });
    set({ hidden, radios: [...get().radios, radio] });
  },
  remove: id => {
    const custom = get().custom.filter(s => s.id !== id);
    const hidden = stations.some(s => s.id === id)
      ? [...new Set([...get().hidden, id])]
      : get().hidden;
    radioListStorage.set({ custom, hidden });
    set({ custom, hidden, radios: get().radios.filter(s => s.id !== id) });
  },
}));
