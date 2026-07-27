import { Test } from '@nestjs/testing';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { LoginDto, RegisterDto } from './auth.schemas';

// AuthService se provee mockeado abajo, pero importar la clase (como token de
// DI) carga auth.service.ts → `@db` → el prisma client real, que no resuelve en
// jest. Mockeamos `@db` para cortar esa cadena.
jest.mock('@db', () => ({ __esModule: true, default: {} }));

describe('AuthController', () => {
  let controller: AuthController;
  const register = jest.fn<(body: RegisterDto) => Promise<unknown>>();
  const login = jest.fn<(body: LoginDto) => Promise<unknown>>();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { register, login } }],
    }).compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  // El controller solo delega: el pipe global valida el request y el service
  // hace el trabajo. El body va casteado porque el DTO es una clase
  // createZodDto y el controller no lo inspecciona.
  it('delegates register to the service', async () => {
    const body = {
      email: 'ana@mail.com',
      password: 'una-clave-larga',
    } as RegisterDto;
    const created = { id: 'user-1', email: 'ana@mail.com' };
    register.mockResolvedValue(created);

    await expect(controller.register(body)).resolves.toEqual(created);
    expect(register).toHaveBeenCalledWith(body);
  });

  it('delegates login to the service', async () => {
    const body = {
      email: 'ana@mail.com',
      password: 'una-clave-larga',
    } as LoginDto;
    const session = {
      accessToken: 'jwt.token.here',
      expiresIn: 604800,
      user: { id: 'user-1', email: 'ana@mail.com' },
    };
    login.mockResolvedValue(session);

    await expect(controller.login(body)).resolves.toEqual(session);
    expect(login).toHaveBeenCalledWith(body);
  });
});
