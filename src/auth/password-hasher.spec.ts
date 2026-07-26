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
});
