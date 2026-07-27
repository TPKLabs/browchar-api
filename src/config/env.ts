import 'dotenv/config';

type NodeEnv = 'development' | 'test' | 'production';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`[ENV] Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('[ENV] PORT must be a number between 1 and 65535');
  }

  return port;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (!value) {
    return 'development';
  }

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error('[ENV] NODE_ENV must be development, test or production');
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return ['http://localhost:3001'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Largo mínimo del secreto de firma del JWT.
 *
 * El secreto es el punto único de falla de toda la autenticación: quien lo
 * tenga puede firmar un token válido para CUALQUIER usuario, sin necesidad de
 * su contraseña. Un secreto corto es adivinable por fuerza bruta offline
 * (basta un token capturado para probar candidatos sin tocar el server), así
 * que se exige un piso y se falla al arrancar en vez de aceptar `"secret"` y
 * enterarnos en producción.
 */
const JWT_SECRET_MIN_LENGTH = 32;

/** Cómo obtener un secreto válido; se repite en todos los errores de abajo. */
const JWT_SECRET_HINT = 'Generá uno con: openssl rand -base64 48';

function parseJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  // `.env.example` trae `JWT_SECRET=` vacío A PROPÓSITO, así que este es el
  // camino que pisa cualquiera que arranque copiando ese archivo. El mensaje
  // tiene que decirle qué hacer, no sólo que falta.
  if (!secret || secret.trim().length === 0) {
    throw new Error(`[ENV] Falta JWT_SECRET. ${JWT_SECRET_HINT}`);
  }

  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `[ENV] JWT_SECRET debe tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres ` +
        `(tiene ${secret.length}). ${JWT_SECRET_HINT}`,
    );
  }

  return secret;
}

/**
 * Duración en el formato del paquete `ms` (`15m`, `2h`, `7d`).
 *
 * Se modela como template literal type y no como `string` para que el valor
 * sea asignable directamente a `signOptions.expiresIn` de @nestjs/jwt, sin un
 * cast que apague el chequeo del lado del consumidor.
 */
export type JwtDuration =
  `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

/** Milisegundos por unidad, para acotar la duración configurada. */
const MS_PER_UNIT: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_536_000_000,
};

/**
 * Piso: un token que vive menos de un minuto es inservible. `0s` o `1ms`
 * producen `exp === iat`, o sea un token **ya vencido al emitirse**: el login
 * responde 200 con `expiresIn: 0` y después todo request falla. Es un error de
 * configuración que conviene atajar al arrancar y no en producción.
 */
const JWT_EXPIRES_MIN_MS = 60_000;

/**
 * Techo: sin revocación del lado del server (DEV-182), la expiración es lo
 * único que termina una sesión. Un token de un año es una credencial casi
 * permanente si se filtra.
 */
const JWT_EXPIRES_MAX_MS = 90 * 86_400_000;

/**
 * Vida del access token.
 *
 * Con JWT stateless la expiración es el ÚNICO mecanismo real de fin de sesión:
 * un token emitido no se puede revocar del lado del server (ver DEV-182). Por
 * eso es configurable — el valor definitivo se decide junto con el manejo de
 * sesión del front (DEV-31) — pero acotado por ambos extremos.
 */
function parseJwtExpiresIn(value: string | undefined): JwtDuration {
  if (!value) {
    return '7d';
  }

  const match = /^(\d+)(ms|s|m|h|d|w|y)$/.exec(value);
  if (!match) {
    throw new Error(
      '[ENV] JWT_EXPIRES_IN debe ser una duración tipo "15m", "2h" o "7d"',
    );
  }

  const totalMs = Number(match[1]) * MS_PER_UNIT[match[2]];

  if (totalMs < JWT_EXPIRES_MIN_MS) {
    throw new Error(
      `[ENV] JWT_EXPIRES_IN (${value}) es demasiado corto: el mínimo es 1m. ` +
        'Una duración menor emite tokens vencidos al instante.',
    );
  }

  if (totalMs > JWT_EXPIRES_MAX_MS) {
    throw new Error(
      `[ENV] JWT_EXPIRES_IN (${value}) es demasiado largo: el máximo es 90d. ` +
        'Sin revocación server-side, un token filtrado sirve hasta que expire.',
    );
  }

  // El regex ya garantiza la forma; TS no puede inferirlo solo.
  return value as JwtDuration;
}

export const env = {
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
  PORT: parsePort(process.env.PORT),
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
  JWT_SECRET: parseJwtSecret(),
  JWT_EXPIRES_IN: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
} as const;
