import * as argon2 from 'argon2';

/**
 * argon2id: recomendado por OWASP como default de propósito general (resiste
 * side-channel y GPU-cracking mejor que argon2i/argon2d).
 *
 * Los parámetros se fijan explícitamente en vez de heredar los defaults de la
 * librería (`m=65536, t=3, p=4`) por dos razones:
 *
 * 1. **Costo.** Hashear es caro a propósito, pero `/auth/register` es un
 *    endpoint sin autenticar: cada request paga ese costo antes de que
 *    sepamos si quien llama es legítimo. Los defaults usan 64 MiB por hash;
 *    estos son el mínimo que recomienda OWASP (19 MiB, t=2) y siguen siendo
 *    holgadamente suficientes contra cracking offline. El rate limiting real
 *    es DEV-210 — esto sólo achica el costo unitario, no lo reemplaza.
 * 2. **`parallelism: 1` es lo correcto en Node.** node-argon2 corre en el
 *    threadpool de libuv, que por default tiene 4 threads. Con `p=4` un solo
 *    hash puede ocupar el pool entero y frenar TODO lo demás que dependa de
 *    él. Con `p=1` cada hash usa un thread y los request concurrentes se
 *    encolan de forma predecible.
 *
 * Los parámetros quedan embebidos en el string del hash, así que cambiarlos
 * no invalida los hashes viejos: siguen verificando con los suyos. Si algún
 * día se suben, `argon2.needsRehash()` permite re-hashear en el próximo login.
 */
const HASH_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB — mínimo recomendado por OWASP
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, HASH_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  plainPassword: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, plainPassword);
}
