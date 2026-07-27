/**
 * Tipos de response del recurso Auth (DEV-84 / DEV-85).
 *
 * Declaran el WIRE: la forma exacta del JSON sobre HTTP (fechas como string
 * ISO 8601), igual que `character.responses.ts`.
 */

/**
 * Usuario tal como lo expone la API.
 *
 * `passwordHash` NO está — y no es un olvido. Este tipo es el único que las
 * respuestas de auth pueden devolver, así que dejarlo afuera hace que filtrar
 * el hash sea un error de compilación y no una revisión de código. Cualquier
 * endpoint que devuelva un usuario debe pasar por acá.
 */
export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * `POST /auth/register` — el body es `AuthRegisterRequestBody` (auth.schemas).
 *
 * Devuelve el usuario creado, NO un token: registrarse y abrir sesión son dos
 * operaciones distintas. Si más adelante se quiere auto-login, el front encadena
 * un `POST /auth/login` — el server no mezcla las dos responsabilidades.
 */
export type AuthRegisterResponse = AuthUser;

/**
 * `POST /auth/login` — el body es `AuthLoginRequestBody` (auth.schemas).
 *
 * Devuelve el token y el usuario juntos para que el front no tenga que
 * encadenar un `GET /auth/me` inmediatamente después de entrar. `/auth/me`
 * sigue haciendo falta igual: al recargar la página el front tiene el token
 * guardado pero no el usuario.
 *
 * `expiresIn` viaja en segundos (no una fecha absoluta) para que el cliente no
 * dependa de que su reloj coincida con el del server.
 */
export interface AuthLoginResponse {
  accessToken: string;
  /** Vida del token en segundos, contada desde que se emitió. */
  expiresIn: number;
  user: AuthUser;
}
