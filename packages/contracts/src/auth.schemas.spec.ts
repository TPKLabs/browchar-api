import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  loginSchema,
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

describe('loginSchema', () => {
  const validBody = { email: 'ana@mail.com', password: 'una-clave-larga' };

  it('acepta un body válido', () => {
    expect(loginSchema.parse(validBody)).toEqual(validBody);
  });

  it('normaliza el email igual que el registro', () => {
    const parsed = loginSchema.parse({ ...validBody, email: '  Ana@Mail.COM ' });

    expect(parsed.email).toBe('ana@mail.com');
  });

  // Si el login aplicara el mínimo del registro, una cuenta creada bajo una
  // política anterior más laxa no podría entrar, y el error de validación
  // revelaría la política vigente antes de probar credenciales.
  it('NO aplica el mínimo de largo del registro', () => {
    const short = 'x'.repeat(PASSWORD_MIN_LENGTH - 1);

    expect(registerSchema.safeParse({ ...validBody, password: short }).success).toBe(
      false,
    );
    expect(loginSchema.safeParse({ ...validBody, password: short }).success).toBe(
      true,
    );
  });

  it('rechaza contraseña vacía', () => {
    const result = loginSchema.safeParse({ ...validBody, password: '' });

    expect(result.success).toBe(false);
  });

  it('rechaza email inválido', () => {
    const result = loginSchema.safeParse({ ...validBody, email: 'ana@' });

    expect(result.success).toBe(false);
  });
});
