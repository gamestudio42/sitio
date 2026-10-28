import { OUTFIT_COUNT, type Person } from '@sitio/simulation';

export const OUTFITS = ['rust', 'blue', 'green', 'ochre', 'plum', 'teal'] as const;

if (OUTFITS.length !== OUTFIT_COUNT) {
  throw new Error('Outfit palette does not match OUTFIT_COUNT');
}

export type PersonRole = 'man' | 'woman' | 'boy' | 'girl';

export function roleOf(person: Person): PersonRole {
  if (person.age < 16) return person.sex === 'female' ? 'girl' : 'boy';
  return person.sex === 'female' ? 'woman' : 'man';
}

export function outfitOf(person: Person): string {
  return String(person.outfit % OUTFIT_COUNT);
}

export function spriteName(role: PersonRole, outfit: string, frame: number): string {
  return `person_${role}_${outfit}_${frame}`;
}

export function personSpriteName(person: Person, frame: number): string {
  return spriteName(roleOf(person), outfitOf(person), frame);
}
