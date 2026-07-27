import type { NodeEnv } from './env';

/**
 * El usuario y los personajes demo tienen credenciales/datos públicos y sólo
 * existen para desarrollo y tests. Nunca deben escribirse en producción.
 */
export function shouldSeedDemoData(nodeEnv: NodeEnv): boolean {
  return nodeEnv !== 'production';
}
