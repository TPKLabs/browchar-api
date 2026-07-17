import type { Character } from '../../../prisma/generated/client';

/**
 * Contratos request/response del módulo Characters.
 *
 * Nota: se modelan como tipos TS (patrón establecido en common/types), no como
 * DTOs class-validator. La validación de request (ValidationPipe + DTOs) se
 * implementa por separado en DEV-81; la validación de `values` contra el
 * template del Playbook, en DEV-48.
 */

/** DEV-153: `ValidationError` vive en `@tpklabs/browchar-contracts` (contrato compartido). */
export type { ValidationError } from '@tpklabs/browchar-contracts';

/**
 * DEV-197: el envelope de paginación vive en `@tpklabs/browchar-contracts`
 * (una sola definición FE/BE). Se re-exporta para los imports internos.
 */
export type { Paginated, PaginationMeta } from '@tpklabs/browchar-contracts';

/**
 * Vista de Character expuesta por la API (fila cruda: `POST /characters`,
 * `GET /characters/:id`).
 *
 * DEV-197: es la forma PRE-serialización (fechas `Date`, `values` JsonValue de
 * Prisma). El contrato wire que consume el front es `CharacterGetResponse` en
 * `@tpklabs/browchar-contracts` (fechas string ISO); la conformidad entre
 * ambos la garantiza `contracts.conformance.spec.ts` en compile time.
 */
export type CharacterView = Character;

/**
 * Item del listado `GET /characters`: el Character enriquecido con los nombres
 * resueltos de su Playbook y su Game, para que el front no tenga que cruzar
 * `usePlaybooks` a mano para armar las tarjetas (DEV-60). Mismo criterio que
 * `GET /playbooks`, que resuelve `gameId` → `game.gameName`.
 *
 * `campaignName` todavía no se resuelve: la relación Character↔Campaign existe
 * en el modelo pero su feature es aparte.
 */
export type CharacterListItem = Character & {
  playbookName: string;
  gameName: string;
};
