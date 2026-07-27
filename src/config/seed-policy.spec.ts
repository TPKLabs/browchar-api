import { shouldSeedDemoData } from './seed-policy';

describe('shouldSeedDemoData', () => {
  it.each(['development', 'test'] as const)(
    'habilita los datos demo en %s',
    (nodeEnv) => {
      expect(shouldSeedDemoData(nodeEnv)).toBe(true);
    },
  );

  it('los deshabilita en producción', () => {
    expect(shouldSeedDemoData('production')).toBe(false);
  });
});
