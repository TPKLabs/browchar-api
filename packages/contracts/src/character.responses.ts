import type { Paginated } from './pagination';

/**
 * Tipos de response del recurso Characters (DEV-197).
 *
 * Declaran el WIRE: la forma exacta del JSON sobre HTTP. Por eso las fechas
 * son `string` (ISO 8601) y no `Date` — JSON no tiene tipo Date. El back
 * trabaja internamente con los tipos de Prisma (fechas `Date`) y un spec de
 * conformidad compile-time en browchar-api garantiza que ambos no driftean;
 * el front consume estos tipos tal cual.
 *
 * Convención de nombres (DEV-197): `<Entidad><Operación>Response`,
 * `<Entidad><Operación>RequestBody`, `<Entidad><Operación>RequestParams`,
 * con operaciones List / Get / Create / Update / Delete.
 */

/** Fila de Character como la serializa la API (espejo wire del modelo Prisma). */
export interface Character {
  id: string;
  name: string;
  ownerId: string;
  /** Forma dinámica definida por el `template` del Playbook (DEV-48). */
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  playbookId: string;
  playbookVersion: number;
}

/**
 * Item de `GET /characters`: el Character enriquecido con los nombres
 * resueltos de su Playbook y su Game (DEV-60), para que el front arme las
 * tarjetas sin cruzar `usePlaybooks` a mano.
 */
export interface CharacterListItem extends Character {
  playbookName: string;
  gameName: string;
}

/* ------------------------------------------------------------------ */
/* Por endpoint                                                        */
/* ------------------------------------------------------------------ */

/** `GET /characters` */
export type CharacterListResponse = Paginated<CharacterListItem>;

/** `GET /characters/:id` */
export interface CharacterGetRequestParams {
  id: string;
}
export type CharacterGetResponse = Character;

/** `POST /characters` — el body es `CharacterCreateRequestBody` (character.schemas). */
export type CharacterCreateResponse = Character;

/** `PATCH /characters/:id` — el body es `CharacterUpdateRequestBody` (character.schemas). */
export interface CharacterUpdateRequestParams {
  id: string;
}
export type CharacterUpdateResponse = Character;
