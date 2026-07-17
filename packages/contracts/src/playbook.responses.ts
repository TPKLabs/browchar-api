import type { TemplateSection } from './fields';

/**
 * Tipos de response del recurso Playbooks (DEV-197). Wire shapes — ver la
 * nota sobre fechas/serialización en `character.responses.ts`.
 *
 * Nota sobre `template`: en la DB es una columna `Json`, pero la API siempre
 * la puebla con `TemplateSection[]` (validado por `templateDefinitionSchema`
 * en `validate:data`); se tipa así porque es la forma real que el front
 * renderiza como form dinámico.
 */

/** Fila de Playbook como la serializa la API (espejo wire del modelo Prisma). */
export interface Playbook {
  id: string;
  gameId: string;
  name: string;
  version: number;
  createdAt: string;
  description?: string | null;
  template: TemplateSection[];
}

/**
 * Vista expuesta por `GET /playbooks` y `GET /playbooks/:id`: la API
 * reemplaza `gameId` por el objeto `game` con el nombre resuelto.
 */
export interface PlaybookView extends Omit<Playbook, 'gameId'> {
  game: {
    gameId: string;
    gameName: string;
  };
}

/* ------------------------------------------------------------------ */
/* Por endpoint                                                        */
/* ------------------------------------------------------------------ */

/** `GET /playbooks` — la query es `PlaybookListRequestParams` (playbook.schemas). */
export type PlaybookListResponse = PlaybookView[];

/** `GET /playbooks/:id` */
export interface PlaybookGetRequestParams {
  id: string;
}
export type PlaybookGetResponse = PlaybookView;
