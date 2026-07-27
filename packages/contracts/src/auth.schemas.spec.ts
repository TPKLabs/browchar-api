import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  registerSchema,
} from './auth.schemas';

describe('registerSchema', () => {
  const validBody = { email: 'ana@mail.com', password: 'una-clave-larga' };

  it('acepta un body válido', () => {
    expect(registerSchema.parse(validBody)).toEqual(validBody);
  });

  it('normaliza el email a minúsculas y sin espacios', () => {
    const parsed = registerSchema.parse({
      ...validBody,
      email: '  Ana@Mail.COM  ',
    });

    expect(parsed.email).toBe('ana@mail.com');
  });

  it('rechaza un email con formato inválido', () => {
    const result = registerSchema.safeParse({ ...validBody, email: 'ana@' });

    expect(result.success).toBe(false);
  });

  it('rechaza un email vacío', () => {
    const result = registerSchema.safeParse({ ...validBody, email: '   ' });

    expect(result.success).toBe(false);
  });

  it(`rechaza contraseñas de menos de ${PASSWORD_MIN_LENGTH} caracteres`, () => {
    const result = registerSchema.safeParse({
      ...validBody,
      password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1),
    });

    expect(result.success).toBe(false);
  });

  it(`acepta una contraseña de exactamente ${PASSWORD_MIN_LENGTH} caracteres`, () => {
    const result = registerSchema.safeParse({
      ...validBody,
      password: 'a'.repeat(PASSWORD_MIN_LENGTH),
    });

    expect(result.success).toBe(true);
  });

  it(`rechaza contraseñas de más de ${PASSWORD_MAX_LENGTH} caracteres`, () => {
    const result = registerSchema.safeParse({
      ...validBody,
      password: 'a'.repeat(PASSWORD_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  // `String.length` cuenta unidades UTF-16, así que un emoji fuera del BMP
  // vale 2. Sin contar code points, la mitad de estos emojis alcanzaría.
  it('cuenta code points, no unidades UTF-16', () => {
    const emojis = '😀'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(emojis.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);

    const result = registerSchema.safeParse({
      ...validBody,
      password: emojis,
    });

    expect(result.success).toBe(false);
  });

  it('acepta el mínimo de code points aunque sean emojis', () => {
    const result = registerSchema.safeParse({
      ...validBody,
      password: '😀'.repeat(PASSWORD_MIN_LENGTH),
    });

    expect(result.success).toBe(true);
  });

  it('no recorta la contraseña: los espacios son caracteres válidos', () => {
    const password = '  passphrase con espacios  ';
    const parsed = registerSchema.parse({ ...validBody, password });

    expect(parsed.password).toBe(password);
  });

  it('rechaza un body sin password', () => {
    const result = registerSchema.safeParse({ email: validBody.email });

    expect(result.success).toBe(false);
  });
});
