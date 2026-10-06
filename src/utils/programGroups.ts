import type { RadioProgram } from '../types';

// Gün/saat farklı olsa da aynı radyodaki aynı başlık tek takip edilen programdır.
export function programKey(program: RadioProgram): string {
  return `${program.stationId}:${program.title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')}`;
}
export function programGroup(programs: RadioProgram[], id: string): string[] {
  const selected = programs.find(p => p.id === id);
  return selected
    ? programs
        .filter(p => programKey(p) === programKey(selected))
        .map(p => p.id)
    : [id];
}
export function expandProgramIds(
  programs: RadioProgram[],
  ids: string[],
): string[] {
  return [...new Set(ids.flatMap(id => programGroup(programs, id)))];
}
