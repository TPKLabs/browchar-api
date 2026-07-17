/**
 * Envelope estándar de paginación (DEV-197).
 *
 * Vivía duplicado a mano en browchar-api (`src/common/types` +
 * `src/common/pagination.ts`) y browchar-fe (`src/types/pagination.types.ts`).
 * No es específico de Characters: cualquier endpoint paginado responde
 * `data`/`meta` con esta forma.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
