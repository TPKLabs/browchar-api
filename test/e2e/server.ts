import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

const isWindows = process.platform === 'win32';

/**
 * Arranca la app con el MISMO comando que producción (`npm run start:prod`), no
 * con un `node dist/...` a mano: así el e2e ejerce el artefacto y el comando
 * desplegables, y una rotura de ese script (p. ej. una ruta mal) rompe el e2e.
 */
export function startServer(port: number, databaseUrl: string): ChildProcess {
  return spawn('npm', ['run', 'start:prod'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(port),
      NODE_ENV: 'test',
    },
    // Windows (Node >=22): ejecutar el `npm.cmd` exige shell. En POSIX no, y el
    // hijo lidera su propio grupo para matar el árbol (npm → node) con -pid.
    shell: isWindows,
    detached: !isWindows,
  });
}

/** Mata el árbol del server y ESPERA su salida (no deja procesos colgados). */
export function stopServer(server: ChildProcess | undefined): Promise<void> {
  if (!server || server.pid === undefined) return Promise.resolve();
  if (server.exitCode !== null || server.signalCode !== null) {
    return Promise.resolve();
  }
  const pid = server.pid;

  return new Promise((resolve) => {
    server.once('exit', () => resolve());
    // Red de seguridad: si el proceso no muere, no colgar el teardown.
    const timeout = setTimeout(() => resolve(), 10000);
    timeout.unref();

    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
      } else {
        process.kill(-pid, 'SIGTERM');
      }
    } catch {
      server.kill('SIGKILL');
    }
  });
}
