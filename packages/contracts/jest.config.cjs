/** Jest del paquete de contratos. `isolatedModules` (en tsconfig.json) hace que
 * ts-jest transpile archivo por archivo, sin exigir project membership (los
 * spec están excluidos del build). */
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Coverage sobre el código con lógica (schemas + fixtures). Se excluye el
  // barrel index.ts y pagination.ts (solo constantes + interfaces, sin
  // comportamiento). Los *.responses.ts y validation.ts son type-only: no
  // generan filas de coverage. El umbral solo corta con --coverage (test:cov).
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/pagination.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 78,
      functions: 88,
      lines: 90,
    },
  },
};
