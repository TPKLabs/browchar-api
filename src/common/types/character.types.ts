import type { Character } from '../../../prisma/generated/client';

/**
 * Contratos request/response del módulo Characters.
 *
 * Nota: se modelan como tipos TS (patrón establecido en common/types), no como
 * DTOs class-validator. La validación de request (ValidationPipe + DTOs) se
 * implementa por separado en DEV-81; la validación de `values` contra el
 * template del Playbook, en DEV-48.
 */

/** Body de POST /characters: crea un personaje a partir de un Playbook. */
export interface CreateCharacterInput {
  name: string;
  playbookId: string;
  /** Valores del personaje, a validar contra el template del Playbook (DEV-48). */
  values: Record<string, unknown>;
  /**
   * Dueño del personaje. En modo dev se recibe explícito; cuando exista auth
   * (DEV-5) saldrá del token y este campo se quitará del body.
   */
  ownerId: string;
}

/** Un error de validación de un campo de `values` contra el template. */
export interface ValidationError {
  field: string;
  message: string;
}

/** Query de GET /characters: filtros + paginación. */
export interface ListCharactersQuery {
  playbookId?: string;
  gameId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

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

/** Vista de Character expuesta por la API. */
export type CharacterView = Character;
