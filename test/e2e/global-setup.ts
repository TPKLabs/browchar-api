import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { BRIDGE_FILE, type E2eBridge } from './bridge';

const PORT = 3999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // El server todavía no está escuchando; reintentamos.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`El server e2e no respondió en ${url} tras ${timeoutMs}ms`);
}

/**
 * Prepara el entorno e2e y lo deja listo para los specs:
 *  1. Postgres efímero (Testcontainers) — `npm run test:e2e` es self-contained.
 *  2. `prisma generate` + `migrate deploy`: cliente fresco y schema aplicado.
 *  3. Build y arranque del server REAL como proceso aparte. Corremos la app de
 *     verdad por HTTP (black-box) en vez de instanciarla dentro de jest: así el
 *     cliente Prisma 7 (engine WASM) corre en node normal, no bajo ts-jest.
 */
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:16').start();
  const databaseUrl = container.getConnectionUri();
  const env = { ...process.env, DATABASE_URL: databaseUrl };

  execSync('npx prisma generate', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
  });
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
  });
  execSync('npm run build', { cwd: process.cwd(), stdio: 'inherit', env });

  const server = spawn('node', ['dist/src/main.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...env, PORT: String(PORT), NODE_ENV: 'test' },
  });
  await waitForServer(`${BASE_URL}/`);

  const bridge: E2eBridge = { baseUrl: BASE_URL, databaseUrl };
  writeFileSync(BRIDGE_FILE, JSON.stringify(bridge));

  // Guardamos contenedor y server en globalThis para pararlos en el teardown
  // (jest corre globalSetup y globalTeardown en el mismo proceso).
  const store = globalThis as {
    __PG_CONTAINER__?: StartedPostgreSqlContainer;
    __E2E_SERVER__?: ChildProcess;
  };
  store.__PG_CONTAINER__ = container;
  store.__E2E_SERVER__ = server;
}
