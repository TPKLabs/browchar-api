import { rmSync } from 'node:fs';
import type { ChildProcess } from 'node:child_process';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { mainBridgeFilePath } from './bridge';
import { stopServer } from './server';

/**
 * Para el server e2e y el contenedor de Postgres, y limpia el archivo puente.
 * Si alguno de los dos falla al parar, la corrida NO termina en verde con
 * recursos vivos: se junta en un `AggregateError` y se re-lanza — jest marca
 * el globalTeardown como fallido.
 */
export default async function globalTeardown(): Promise<void> {
  const store = globalThis as {
    __PG_CONTAINER__?: StartedPostgreSqlContainer;
    __E2E_SERVER__?: ChildProcess;
    __E2E_BRIDGE_FILE__?: string;
  };

  // allSettled: que una falla al parar el contenedor no impida esperar la
  // salida del server, y viceversa — ambos cleanups se intentan siempre.
  const results = await Promise.allSettled([
    stopServer(store.__E2E_SERVER__),
    store.__PG_CONTAINER__?.stop() ?? Promise.resolve(),
  ]);

  // El archivo puente se borra siempre, incluso si algo de arriba rechazó.
  rmSync(store.__E2E_BRIDGE_FILE__ ?? mainBridgeFilePath(), { force: true });

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.reason as unknown),
      `El e2e globalTeardown falló al limpiar ${failures.length} recurso(s) (server/contenedor) — pueden haber quedado vivos.`,
    );
  }
}
