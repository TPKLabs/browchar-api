import path from 'node:path';

/**
 * Directorio de artefactos del e2e (junit + logs). El CI lo sube cuando el e2e
 * falla (ver ci.yml). Gitignoreado.
 */
export const RESULTS_DIR = path.join(process.cwd(), 'test-results');
export const SERVER_LOG = path.join(RESULTS_DIR, 'e2e-server.log');
export const POSTGRES_LOG = path.join(RESULTS_DIR, 'e2e-postgres.log');
