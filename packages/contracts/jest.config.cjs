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
};
