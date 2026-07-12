import type { Game } from '../../../prisma/generated/client';

/**
 * Vista de Game expuesta por `GET /games`: sólo lo que el front necesita para
 * el listado de juegos (`browchar-fe` `Game` type). El resto de columnas del
 * modelo (`systemId`, `key`, `createdAt`) no se exponen.
 */
export type GameView = Pick<Game, 'id' | 'name'>;
