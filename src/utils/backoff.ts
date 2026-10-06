// Sınırlı üstel bekleme, uzun kesintilerde ağ ve pil tüketimini azaltır.
export function reconnectDelay(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, Math.min(5, attempt)));
}
