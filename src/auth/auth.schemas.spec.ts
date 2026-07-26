import { registerSchema as contractsRegisterSchema } from '@tpklabs/browchar-contracts';
import { RegisterDto, registerSchema } from './auth.schemas';

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
});
