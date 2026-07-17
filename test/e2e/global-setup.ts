import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import net from 'node:net';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { mainBridgeFilePath, type E2eBridge } from './bridge';

/** Puerto libre efímero: evita colisiones con un puerto fijo o corridas paralelas. */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

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
 *
 * Si cualquier paso falla, jest NO corre `globalTeardown`, así que limpiamos a
 * mano lo ya creado (contenedor y server) antes de propagar el error.
 */
export default async function globalSetup(): Promise<void> {
  let container: StartedPostgreSqlContainer | undefined;
  let server: ChildProcess | undefined;

  try {
    container = await new PostgreSqlContainer('postgres:16').start();
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

    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...env, PORT: String(port), NODE_ENV: 'test' },
    });
    await waitForServer(`${baseUrl}/`);

    const bridge: E2eBridge = { baseUrl, databaseUrl };
    const bridgeFile = mainBridgeFilePath();
    process.env.E2E_BRIDGE_FILE = bridgeFile;
    writeFileSync(bridgeFile, JSON.stringify(bridge));

    // Guardamos contenedor, server y archivo para el teardown (jest corre
    // globalSetup y globalTeardown en el mismo proceso).
    const store = globalThis as {
      __PG_CONTAINER__?: StartedPostgreSqlContainer;
      __E2E_SERVER__?: ChildProcess;
      __E2E_BRIDGE_FILE__?: string;
    };
    store.__PG_CONTAINER__ = container;
    store.__E2E_SERVER__ = server;
    store.__E2E_BRIDGE_FILE__ = bridgeFile;
  } catch (error) {
    server?.kill();
    await container?.stop();
    throw error;
  }
}
