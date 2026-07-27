import type { User } from '../../../prisma/generated/client';

/**
 * Vista de User expuesta por la API (`POST /auth/register`).
 *
 * Es la forma PRE-serialización: `createdAt` es `Date` porque viene de Prisma;
 * Nest lo serializa a string ISO al escribir el JSON. El contrato wire que
 * consume el front es `AuthUser` en `@tpklabs/browchar-contracts` (fechas
 * string); la conformidad entre ambos la garantiza `contracts.conformance.spec.ts`
 * en compile time — mismo criterio que `CharacterView` (DEV-197).
 *
 * Se construye con `Pick` sobre el modelo de Prisma en vez de escribir los
 * campos a mano: así `passwordHash` queda afuera por construcción, y si mañana
 * se agrega una columna sensible al modelo, no se cuela sola en la respuesta.
 */
export type AuthUserView = Pick<User, 'id' | 'email' | 'createdAt'>;

/**
 * Payload del access token.
 *
 * `sub` (subject) es el claim estándar de JWT para "de quién es este token";
 * se usa el nombre registrado en vez de un `userId` propio para que cualquier
 * librería que lea el token lo entienda.
 *
 * Deliberadamente mínimo: el contenido de un JWT va firmado pero **no
 * cifrado**, o sea que es legible por cualquiera que tenga el token. Todo lo
 * que se agregue acá es información que se publica.
 */
export interface JwtPayload {
  sub: string;
}

/**
 * Sesión emitida por `POST /auth/login`, PRE-serialización.
 *
 * Igual que `AuthUserView`, el `createdAt` de adentro es `Date` porque viene
 * de Prisma; Nest lo serializa a string ISO. El contrato wire equivalente es
 * `AuthLoginResponse` en `@tpklabs/browchar-contracts`, y la paridad de claves
 * la verifica `contracts.conformance.spec.ts`.
 */
export interface AuthSessionView {
  accessToken: string;
  expiresIn: number;
  user: AuthUserView;
}
