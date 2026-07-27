import {
  loginSchema as contractsLoginSchema,
  registerSchema as contractsRegisterSchema,
} from '@tpklabs/browchar-contracts';
import {
  LoginDto,
  RegisterDto,
  loginSchema,
  registerSchema,
} from './auth.schemas';

/**
 * Este archivo no define reglas propias: las de `registerSchema` (formato de
 * email, largo de contraseña, normalización) viven en el paquete compartido y
 * se testean ahí. Lo que sí es propio del back —y lo único que puede romperse
 * acá— es el cableado: que el DTO que consume el controller lleve REALMENTE
 * este schema. Pasarle otro por error compila igual y dejaría el endpoint
 * validando algo distinto de lo que declara el contrato.
 */
describe('auth.schemas', () => {
  it('re-exporta el schema del paquete compartido, sin redefinirlo', () => {
    expect(registerSchema).toBe(contractsRegisterSchema);
  });

  it('RegisterDto expone el schema de registro', () => {
    expect(RegisterDto.schema).toBe(registerSchema);
  });

  it('RegisterDto valida a través de ese schema', () => {
    const body = { email: 'ana@mail.com', password: 'una-clave-larga' };

    expect(RegisterDto.schema.parse(body)).toEqual(body);
    expect(
      RegisterDto.schema.safeParse({ ...body, password: 'x' }).success,
    ).toBe(false);
  });

  it('re-exporta tambien el schema de login del paquete compartido', () => {
    expect(loginSchema).toBe(contractsLoginSchema);
  });

  it('LoginDto expone el schema de login, no el de registro', () => {
    expect(LoginDto.schema).toBe(loginSchema);
    expect(LoginDto.schema).not.toBe(RegisterDto.schema);
  });
});
