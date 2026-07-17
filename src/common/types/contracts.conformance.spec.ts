import type {
  Character as WireCharacter,
  CharacterListItem as WireCharacterListItem,
  PlaybookView as WirePlaybookView,
} from '@tpklabs/browchar-contracts';
import type { CharacterListItem, CharacterView } from './character.types';
import type { PlaybookView } from './playbook.types';

/**
 * Conformidad compile-time entre los tipos internos del back (derivados de
 * Prisma, fechas `Date`) y el contrato wire de `@tpklabs/browchar-contracts`
 * (fechas string ISO) — DEV-197.
 *
 * No se pueden comparar por asignabilidad directa (Date vs string, JsonValue
 * vs Record), así que se verifica la clase de drift que importa: **paridad de
 * claves**. Agregar, quitar o renombrar una columna en Prisma sin actualizar
 * el contrato (o al revés) rompe la compilación de este spec. El tipo de cada
 * campo compartido lo cubren los contract tests de runtime (DEV-202) y el
 * typecheck del front contra el paquete publicado.
 */

type KeysMatch<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : { faltanEnInterno: Exclude<keyof B, keyof A> }
  : { faltanEnContrato: Exclude<keyof A, keyof B> };

// Si alguna de estas líneas deja de compilar, el shape interno y el contrato
// wire divergieron: el tipo del error dice qué claves faltan y de qué lado.
const characterKeysMatch: KeysMatch<CharacterView, WireCharacter> = true;
const listItemKeysMatch: KeysMatch<CharacterListItem, WireCharacterListItem> =
  true;
const playbookViewKeysMatch: KeysMatch<PlaybookView, WirePlaybookView> = true;

describe('conformidad contrato wire <-> tipos internos (DEV-197)', () => {
  it('las claves de Character, CharacterListItem y PlaybookView coinciden con el contrato', () => {
    // El trabajo real lo hace el typechecker arriba; esto solo evita que jest
    // marque el archivo como suite vacía.
    expect(characterKeysMatch).toBe(true);
    expect(listItemKeysMatch).toBe(true);
    expect(playbookViewKeysMatch).toBe(true);
  });
});
