export function toggleFavorite(ids: string[], id: string): string[] {
  return ids.includes(id)
    ? ids.filter(item => item !== id)
    : [...new Set([...ids, id])];
}
