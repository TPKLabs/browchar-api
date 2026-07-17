import { rmSync } from 'node:fs';
import type { ChildProcess } from 'node:child_process';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { BRIDGE_FILE } from './bridge';

/** Para el server e2e y el contenedor de Postgres, y limpia el archivo puente. */
export default async function globalTeardown(): Promise<void> {
  const store = globalThis as {
    __PG_CONTAINER__?: StartedPostgreSqlContainer;
    __E2E_SERVER__?: ChildProcess;
  };
  store.__E2E_SERVER__?.kill();
  await store.__PG_CONTAINER__?.stop();
  rmSync(BRIDGE_FILE, { force: true });
}
