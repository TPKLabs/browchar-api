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
