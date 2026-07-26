import { z } from 'zod';

/**
 * Schemas Zod de request del recurso Auth (DEV-84 / DEV-85).
 *
 * Fuente de verdad compartida: el back los envuelve con `createZodDto`
 * (nestjs-zod) para validar en runtime y el front los reutiliza para los forms
 * de registro y login, así ambos lados aplican exactamente las mismas reglas.
 */

/**
 * Largo mínimo de contraseña. 8 es el piso que recomienda NIST SP 800-63B.
 * A propósito NO exigimos composición (mayúscula + número + símbolo): esas
 * reglas empujan a los usuarios hacia contraseñas predecibles tipo `Passw0rd!`
 * y la misma guía las desaconseja. El largo es lo que aporta entropía real.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Tope de largo. No es una restricción de seguridad sino de costo: argon2 es
 * deliberadamente caro de computar, así que hashear una contraseña arbitrariamente
 * larga es un vector de DoS. 128 deja lugar de sobra para una passphrase.
 */
export const PASSWORD_MAX_LENGTH = 128;

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
  .min(
    PASSWORD_MIN_LENGTH,
    `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`,
  );

/** `POST /auth/register` */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** Body de `POST /auth/register` (convención DEV-197). */
export type AuthRegisterRequestBody = z.infer<typeof registerSchema>;
