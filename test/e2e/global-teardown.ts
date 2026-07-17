import { rmSync } from 'node:fs';
import type { ChildProcess } from 'node:child_process';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { mainBridgeFilePath } from './bridge';
import { stopServer } from './server';

/** Para el server e2e y el contenedor de Postgres, y limpia el archivo puente. */
export default async function globalTeardown(): Promise<void> {
  const store = globalThis as {
    __PG_CONTAINER__?: StartedPostgreSqlContainer;
    __E2E_SERVER__?: ChildProcess;
    __E2E_BRIDGE_FILE__?: string;
  };

  // allSettled: que una falla al parar el contenedor no impida esperar la
  // salida del server, y viceversa.
  await Promise.allSettled([
    stopServer(store.__E2E_SERVER__),
    store.__PG_CONTAINER__?.stop() ?? Promise.resolve(),
  ]);

  // El archivo puente se borra siempre, incluso si algo de arriba rechazó.
  rmSync(store.__E2E_BRIDGE_FILE__ ?? mainBridgeFilePath(), { force: true });
}
