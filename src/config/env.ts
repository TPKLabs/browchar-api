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

function parseJwtSecret(): string {
  const secret = getRequiredEnv('JWT_SECRET');

  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `[ENV] JWT_SECRET debe tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres ` +
        `(tiene ${secret.length}). Generá uno con: openssl rand -base64 48`,
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

/**
 * Vida del access token.
 *
 * Con JWT stateless la expiración es el ÚNICO mecanismo real de fin de sesión:
 * un token emitido no se puede revocar del lado del server (ver DEV-182). Por
 * eso es configurable — el valor definitivo se decide junto con el manejo de
 * sesión del front (DEV-31).
 */
function parseJwtExpiresIn(value: string | undefined): JwtDuration {
  if (!value) {
    return '7d';
  }

  if (!/^\d+(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error(
      '[ENV] JWT_EXPIRES_IN debe ser una duración tipo "15m", "2h" o "7d"',
    );
  }

  // El regex de arriba ya garantiza la forma; TS no puede inferirlo solo.
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
