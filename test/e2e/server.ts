import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';

const isWindows = process.platform === 'win32';

/** Clave pública y descartable usada sólo por el server e2e efímero. */
export const E2E_JWT_SECRET = 'e2e-only-jwt-secret-not-for-any-real-use';

/** Cuánto esperar SIGTERM antes de escalar a SIGKILL, y a SIGKILL antes de darse por vencido. */
const GRACE_MS = 10000;
const KILL_MS = 5000;

/**
 * Arranca la app con el MISMO comando que producción (`npm run start:prod`), no
 * con un `node dist/...` a mano: así el e2e ejerce el artefacto y el comando
 * desplegables, y una rotura de ese script (p. ej. una ruta mal) rompe el e2e.
 *
 * stdout/stderr del server van a `logPath` (no a la consola): en CI ese archivo
 * se sube como artefacto cuando el e2e falla, para diagnosticar.
 */
export function startServer(
  port: number,
  databaseUrl: string,
  logPath: string,
): ChildProcess {
  const logFd = openSync(logPath, 'w');
  try {
    return spawn('npm', ['run', 'start:prod'], {
      cwd: process.cwd(),
      stdio: ['ignore', logFd, logFd],
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PORT: String(port),
        NODE_ENV: 'test',
        // Secreto fijo SOLO para el e2e: `env.ts` exige >=32 caracteres y hace
        // fallar el arranque si falta, y en CI no hay `.env`. Es público a
        // propósito — firma tokens de una base efímera que se destruye al
        // terminar la corrida. Nunca usar este valor fuera de los tests.
        JWT_SECRET: process.env.JWT_SECRET ?? E2E_JWT_SECRET,
      },
      // Windows (Node >=22): ejecutar el `npm.cmd` exige shell. En POSIX no, y el
      // hijo lidera su propio grupo para matar el árbol (npm → node) con -pid.
      shell: isWindows,
      detached: !isWindows,
    });
  } finally {
    // El hijo ya heredó (dup) el fd; la copia del padre se puede cerrar.
    closeSync(logFd);
  }
}

function killGroup(pid: number): void {
  try {
    if (isWindows) {
      // /F ya es un kill forzado — no hay distinción SIGTERM/SIGKILL en Windows.
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // El proceso puede haber muerto entre el check y el kill.
  }
}

/**
 * Mata el árbol del server y ESPERA su salida real (no deja procesos
 * colgados). Empieza con SIGTERM; si no salió en `GRACE_MS`, escala a SIGKILL
 * sobre el grupo entero. Si ni eso lo baja en `KILL_MS` más, rechaza — un
 * server que sobrevive a SIGKILL no debería dejar pasar el teardown en verde.
 */
export function stopServer(server: ChildProcess | undefined): Promise<void> {
  if (!server || server.pid === undefined) return Promise.resolve();
  if (server.exitCode !== null || server.signalCode !== null) {
    return Promise.resolve();
  }
  const pid = server.pid;

  return new Promise((resolve, reject) => {
    let exited = false;
    server.once('exit', () => {
      exited = true;
      resolve();
    });

    try {
      if (isWindows) {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
      } else {
        process.kill(-pid, 'SIGTERM');
      }
    } catch {
      // El proceso puede haber muerto entre el check y el kill; el listener
      // 'exit' (si llegó a dispararse antes) ya resolvió.
    }

    const escalate = setTimeout(() => {
      if (exited) return;
      killGroup(pid);

      const giveUp = setTimeout(() => {
        if (exited) return;
        reject(
          new Error(
            `El server e2e (pid ${pid}) no terminó ni tras SIGKILL en ${GRACE_MS + KILL_MS}ms`,
          ),
        );
      }, KILL_MS);
      giveUp.unref();
    }, GRACE_MS);
    escalate.unref();
  });
}
