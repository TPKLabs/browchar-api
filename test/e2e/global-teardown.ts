import { rmSync } from 'node:fs';
import type { ChildProcess } from 'node:child_process';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { mainBridgeFilePath } from './bridge';

/** Para el server e2e y el contenedor de Postgres, y limpia el archivo puente. */
export default async function globalTeardown(): Promise<void> {
  const store = globalThis as {
    __PG_CONTAINER__?: StartedPostgreSqlContainer;
    __E2E_SERVER__?: ChildProcess;
    __E2E_BRIDGE_FILE__?: string;
  };
  store.__E2E_SERVER__?.kill();
  await store.__PG_CONTAINER__?.stop();
  rmSync(store.__E2E_BRIDGE_FILE__ ?? mainBridgeFilePath(), { force: true });
}
