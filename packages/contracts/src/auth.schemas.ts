import { z } from 'zod';

/**
 * Schemas Zod de request del recurso Auth (DEV-84 / DEV-85).
 *
 * Fuente de verdad compartida: el back los envuelve con `createZodDto`
 * (nestjs-zod) para validar en runtime y el front los reutiliza para los forms
 * de registro y login, así ambos lados aplican exactamente las mismas reglas.
 */

/**
 * Largo mínimo de contraseña.
 *
 * **Desviación deliberada del estándar, no un descuido.** NIST SP 800-63B-4
 * exige (SHALL) un mínimo de **15** caracteres cuando la contraseña es el
 * único factor de autenticación — los 8 que suelen citarse aplican sólo si
 * hay MFA, y acá no la hay. Se eligió 12 conscientemente (2026-07-26),
 * priorizando que el registro no friccione en una app de fichas de rol.
 *
 * Si algún día se suma MFA, 8 pasaría a ser admisible; si se sube el piso a
 * 15, hay que contemplar la migración de las cuentas ya creadas.
 *
 * Lo que sí seguimos de la guía: NO exigir composición (mayúscula + número +
 * símbolo). NIST lo prohíbe explícitamente (SHALL NOT) porque empuja a
 * contraseñas predecibles tipo `Passw0rd!`. El largo es lo que aporta entropía.
 *
 * Falta todavía el blocklist de contraseñas conocidas/comprometidas, que NIST
 * exige (SHALL) — ver DEV-213.
 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Tope de largo. No es una restricción de seguridad sino de costo: argon2 es
 * deliberadamente caro de computar, así que hashear una contraseña arbitrariamente
 * larga es un vector de DoS. 128 deja lugar de sobra para una passphrase.
 */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Cuenta *code points* Unicode, no unidades UTF-16.
 *
 * `String.length` cuenta unidades UTF-16, así que un emoji fuera del BMP vale
 * 2 y `'😀😀😀😀😀😀'` pasaría un `.min(12)` con sólo 6 caracteres reales. El
 * spread del string itera por code points y da la cuenta que el usuario ve.
 *
 * (Un cluster de grafemas como 👨‍👩‍👧‍👦 sigue contando como varios code points;
 * segmentar grafemas es exagerado para esto y jugaría en contra del mínimo.)
 */
const countCodePoints = (value: string): number => [...value].length;

/**
 * Email normalizado: `trim` + `toLowerCase` ANTES de validar el formato.
 *
 * La normalización no es cosmética — la unicidad de `User.email` la aplica
 * Postgres, que compara case-sensitive. Sin bajar a minúsculas, `Ana@mail.com`
 * y `ana@mail.com` serían dos cuentas distintas y el login fallaría según cómo
 * el usuario haya tipeado el mail ese día.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('email inválido'));

const passwordSchema = z
  .string()
  .refine((value) => countCodePoints(value) >= PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  })
  .refine((value) => countCodePoints(value) <= PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`,
  });

/** `POST /auth/register` */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** Body de `POST /auth/register` (convención DEV-197). */
export type AuthRegisterRequestBody = z.infer<typeof registerSchema>;
