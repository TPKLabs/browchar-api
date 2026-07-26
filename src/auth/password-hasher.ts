import * as argon2 from 'argon2';

/**
 * argon2id: recomendado por OWASP como default de propósito general (resiste
 * side-channel y GPU-cracking mejor que argon2i/argon2d).
 */
const HASH_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
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
