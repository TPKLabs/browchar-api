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

/** Metadata de paginación del envelope estándar. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

/** Envelope estándar `data`/`meta` para respuestas paginadas (convención REST). */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Vista de Character expuesta por la API (fila cruda: `POST /characters`, `GET /characters/:id`). */
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
