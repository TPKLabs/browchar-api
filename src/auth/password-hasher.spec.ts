import { Logger } from '@nestjs/common';
import { afterEach, jest } from '@jest/globals';
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from './password-hasher';

const argon2Module = jest.requireActual<typeof import('argon2')>('argon2');

describe('password-hasher', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      verifyPassword('dev-only-not-a-real-hash', 'cualquier-cosa'),
    ).resolves.toBe(false);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('returns false on an empty stored hash', async () => {
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(verifyPassword('', 'cualquier-cosa')).resolves.toBe(false);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('pays a real dummy verification after a malformed stored hash', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const verifySpy = jest.spyOn(argon2Module, 'verify');

    await expect(
      verifyPassword('dev-only-not-a-real-hash', 'cualquier-cosa'),
    ).resolves.toBe(false);

    expect(verifySpy).toHaveBeenCalledTimes(2);
    expect(verifySpy).toHaveBeenNthCalledWith(
      2,
      DUMMY_PASSWORD_HASH,
      'cualquier-cosa',
    );
  });

  it('propagates an operational failure from the dummy verification', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const dummyFailure = new Error('argon2 unavailable');
    jest
      .spyOn(argon2Module, 'verify')
      .mockRejectedValueOnce(new Error('stored hash cannot be parsed'))
      .mockRejectedValueOnce(dummyFailure);

    await expect(
      verifyPassword('dev-only-not-a-real-hash', 'cualquier-cosa'),
    ).rejects.toBe(dummyFailure);
  });

  it('pins the OWASP-minimum parameters in the produced hash', async () => {
    const hash = await hashPassword('correct horse battery staple');

    // Fijados a proposito: heredar los defaults de la libreria (m=65536, p=4)
    // encarece un endpoint sin auth y ocupa el threadpool entero de libuv.
    expect(hash).toContain('$m=19456,p=1,t=2$');
  });
});
