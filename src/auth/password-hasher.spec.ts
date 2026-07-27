import { hashPassword, verifyPassword } from './password-hasher';

describe('password-hasher', () => {
  it('hashes a password into an argon2id string distinct from the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).not.toBe('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('produces a different hash for the same password on each call (random salt)', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('s3cr3t!');

    await expect(verifyPassword(hash, 's3cr3t!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cr3t!');

    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  // Un hash malformado hace que argon2.verify LANCE, no que devuelva false.
  // Si esa excepcion se propagara, un usuario con el hash corrupto en la base
  // daria 500 mientras un email inexistente da 401 — diferencia suficiente
  // para saber que la cuenta existe.
  it('returns false instead of throwing on a malformed stored hash', async () => {
    await expect(
      verifyPassword('dev-only-not-a-real-hash', 'cualquier-cosa'),
    ).resolves.toBe(false);
  });

  it('returns false on an empty stored hash', async () => {
    await expect(verifyPassword('', 'cualquier-cosa')).resolves.toBe(false);
  });

  it('pins the OWASP-minimum parameters in the produced hash', async () => {
    const hash = await hashPassword('correct horse battery staple');

    // Fijados a proposito: heredar los defaults de la libreria (m=65536, p=4)
    // encarece un endpoint sin auth y ocupa el threadpool entero de libuv.
    expect(hash).toContain('$m=19456,p=1,t=2$');
  });
});
