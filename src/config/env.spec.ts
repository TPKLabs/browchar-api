import {
  describe,
  it,
  beforeEach,
  afterAll,
  expect,
  jest,
} from '@jest/globals';

/**
 * `env.ts` valida al importarse, así que cada caso arma su `process.env` y
 * re-importa el módulo en aislamiento. No alcanza con llamar a una función:
 * el punto de estas reglas es justamente que un despliegue mal configurado
 * falle al ARRANCAR y no en la primera request.
 */
const BASE_ENV = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'un-secreto-de-al-menos-32-caracteres-de-largo',
};

const ORIGINAL_ENV = process.env;

function loadEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...BASE_ENV, ...overrides } as NodeJS.ProcessEnv;

  let loaded: typeof import('./env').env | undefined;
  jest.isolateModules(() => {
    // `require` y no `import`: la carga tiene que ser SINCRÓNICA y adentro del
    // callback para que `isolateModules` la aísle. Un `import()` dinámico
    // resuelve después de que el callback terminó y reusaría el módulo cacheado.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = (require('./env') as typeof import('./env')).env;
  });
  return loaded!;
}

describe('env', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('JWT_SECRET', () => {
    it('acepta un secreto suficientemente largo', () => {
      expect(loadEnv({}).JWT_SECRET).toBe(BASE_ENV.JWT_SECRET);
    });

    // `.env.example` trae el valor vacío a propósito: un placeholder que pasara
    // la validación haría que todos los clones arranquen con la misma clave
    // públicamente conocida, y cualquiera podría firmar tokens de cualquiera.
    it('falla si falta (el caso de copiar .env.example tal cual)', () => {
      expect(() => loadEnv({ JWT_SECRET: undefined })).toThrow(
        /Falta JWT_SECRET/,
      );
    });

    it('falla si está vacío o son sólo espacios', () => {
      expect(() => loadEnv({ JWT_SECRET: '   ' })).toThrow(/Falta JWT_SECRET/);
    });

    it('falla si es más corto que el mínimo', () => {
      expect(() => loadEnv({ JWT_SECRET: 'corto' })).toThrow(
        /al menos 32 caracteres/,
      );
    });

    it('el error dice cómo generar uno válido', () => {
      expect(() => loadEnv({ JWT_SECRET: 'corto' })).toThrow(/openssl rand/);
    });
  });

  describe('JWT_EXPIRES_IN', () => {
    it('usa 7d por defecto', () => {
      expect(loadEnv({}).JWT_EXPIRES_IN).toBe('7d');
    });

    it('acepta duraciones razonables', () => {
      expect(loadEnv({ JWT_EXPIRES_IN: '15m' }).JWT_EXPIRES_IN).toBe('15m');
      expect(loadEnv({ JWT_EXPIRES_IN: '2h' }).JWT_EXPIRES_IN).toBe('2h');
    });

    it('rechaza un formato que no es una duración', () => {
      expect(() => loadEnv({ JWT_EXPIRES_IN: 'un-rato' })).toThrow(
        /debe ser una duración/,
      );
    });

    // `0s` y `1ms` producen `exp === iat`: el login responde 200 con
    // `expiresIn: 0` y el token nace vencido.
    it.each(['0s', '1ms', '30s'])(
      'rechaza %s por emitir tokens vencidos al instante',
      (value) => {
        expect(() => loadEnv({ JWT_EXPIRES_IN: value })).toThrow(
          /demasiado corto/,
        );
      },
    );

    // Sin revocación server-side (DEV-182) la expiración es lo único que corta
    // una sesión; un token de un año es una credencial casi permanente.
    it.each(['1y', '365d'])('rechaza %s por durar demasiado', (value) => {
      expect(() => loadEnv({ JWT_EXPIRES_IN: value })).toThrow(
        /demasiado largo/,
      );
    });

    it('acepta los límites exactos', () => {
      expect(loadEnv({ JWT_EXPIRES_IN: '1m' }).JWT_EXPIRES_IN).toBe('1m');
      expect(loadEnv({ JWT_EXPIRES_IN: '90d' }).JWT_EXPIRES_IN).toBe('90d');
    });
  });
});
