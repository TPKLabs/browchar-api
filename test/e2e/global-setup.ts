import { execSync, type ChildProcess } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { mainBridgeFilePath, type E2eBridge } from './bridge';
import { POSTGRES_LOG, RESULTS_DIR, SERVER_LOG } from './artifacts';
import { startServer, stopServer } from './server';

// Imagen pinneada por digest: la misma bit-a-bit en cada corrida y en CI
// (`postgres:16` es un tag mutable). Actualizar el digest a mano al subir de
// versión.
const POSTGRES_IMAGE =
  'postgres:16@sha256:468e1f126ca5af849799cda06ac9b03d8090aae9fa5163408b3e8da44fad0702';

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
 * Prepara el entorno e2e y lo deja listo para los specs. Solo hace lo que
 * DEPENDE del contenedor: `prisma generate` y el build se corren una vez antes
 * de jest (script `test:e2e`), no acá.
 *  1. Postgres efímero (Testcontainers) — `npm run test:e2e` es self-contained.
 *  2. `migrate deploy`: aplica el schema al contenedor recién creado.
 *  3. Arranca el server REAL con `npm run start:prod` (proceso aparte). Se corre
 *     la app compilada por HTTP (black-box), no `Test.createTestingModule`,
 *     porque el cliente Prisma 7 (engine WASM) no inicializa bajo ts-jest.
 *
 * Si algún paso falla, jest NO corre `globalTeardown`; limpiamos a mano lo ya
 * creado (server y contenedor) sin tapar el error original y lo re-lanzamos.
 */
export default async function globalSetup(): Promise<void> {
  let container: StartedPostgreSqlContainer | undefined;
  let server: ChildProcess | undefined;

  mkdirSync(RESULTS_DIR, { recursive: true });

  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
    const databaseUrl = container.getConnectionUri();

    // Logs del contenedor en archivo aparte: si el e2e falla, CI los sube como
    // artefacto para diagnosticar sin volver a reproducir.
    const pgLogStream = createWriteStream(POSTGRES_LOG);
    (await container.logs()).pipe(pgLogStream);

    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = startServer(port, databaseUrl, SERVER_LOG);
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
    // allSettled: que fallar al parar uno no impida parar el otro; y throw del
    // error ORIGINAL, no del de cleanup.
    await Promise.allSettled([
      stopServer(server),
      container?.stop() ?? Promise.resolve(),
    ]);
    throw error;
  }
}
