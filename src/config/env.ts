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

export const env = {
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
  PORT: parsePort(process.env.PORT),
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
} as const;
