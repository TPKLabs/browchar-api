import os from 'node:os';
import path from 'node:path';

/**
 * Archivo puente entre el `globalSetup` de jest (proceso main: levanta el
 * contenedor de Postgres y el server e2e) y los specs (procesos worker). El
 * globalSetup deja acá la URL del server y la connection string; los specs las
 * leen para pegarle por HTTP (supertest) e insertar fixtures (pg).
 */
export const BRIDGE_FILE = path.join(os.tmpdir(), 'browchar-e2e-bridge.json');

export interface E2eBridge {
  /** URL base del server e2e (corre como proceso aparte). */
  baseUrl: string;
  /** Connection string del Postgres efímero, para insertar fixtures con `pg`. */
  databaseUrl: string;
}
