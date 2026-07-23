import os from 'node:os';
import path from 'node:path';

/**
 * Puente entre el `globalSetup` de jest (proceso main: levanta el contenedor de
 * Postgres y el server e2e) y los specs (procesos worker). El globalSetup deja
 * la URL del server y la connection string en un archivo; los specs las leen
 * para pegarle por HTTP (supertest) e insertar fixtures (pg).
 */
export interface E2eBridge {
  /** URL base del server e2e (corre como proceso aparte). */
  baseUrl: string;
  /** Connection string del Postgres efímero, para insertar fixtures con `pg`. */
  databaseUrl: string;
}

function bridgeFileFor(pid: number): string {
  return path.join(os.tmpdir(), `browchar-e2e-bridge-${pid}.json`);
}

/**
 * Ruta del archivo puente, única por corrida — así dos `npm run test:e2e` en
 * paralelo no se pisan. globalSetup/teardown corren en el proceso main de jest.
 */
export function mainBridgeFilePath(): string {
  return bridgeFileFor(process.pid);
}

/**
 * Misma ruta, calculada desde un spec (worker). Los workers son hijos del
 * proceso main de jest, así que su `process.ppid` es el pid de ese main → dan
 * el mismo nombre sin depender de que env se propague. En `--runInBand` no hay
 * workers: globalSetup dejó la ruta en env (mismo proceso) y se usa esa.
 */
export function readBridgeFilePath(): string {
  return process.env.E2E_BRIDGE_FILE ?? bridgeFileFor(process.ppid);
}
