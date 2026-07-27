import { ConflictException, Injectable, Logger } from '@nestjs/common';
import prisma from '@db';
import type { AuthRegisterRequestBody } from '@tpklabs/browchar-contracts';
import type { AuthUserView } from '@/common/types/auth.types';
import { hashPassword } from './password-hasher';

/** Columnas que la API puede exponer de un User: nunca `passwordHash`. */
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * POST /auth/register.
   *
   * El schema ya normalizó el email (trim + lowercase) y validó el largo de la
   * contraseña, así que acá sólo queda hashear y persistir.
   *
   * La unicidad del email se chequea DOS veces, y las dos hacen falta:
   *
   * - El `findUnique` de abajo es una fast path de costo: hashear con argon2 es
   *   deliberadamente caro y este endpoint no está autenticado, así que repetir
   *   el mismo email conocido sería una forma barata de quemarnos CPU. Cortar
   *   antes del hash convierte ese abuso en un lookup por índice. No alcanza
   *   contra emails random — eso es rate limiting (DEV-210).
   * - El `catch` del P2002 es el que garantiza la corrección: entre el chequeo
   *   y el insert hay una ventana en la que otra request puede crear el mismo
   *   email, y el índice de Postgres es el único árbitro sin esa carrera.
   *
   * Nota: devolver 409 ante un email ya registrado permite enumerar cuentas
   * (saber si una dirección tiene usuario). Es una concesión consciente a la
   * UX del registro — la alternativa es una respuesta genérica + verificación
   * por email, que necesita un servicio de mail que hoy no existe. Mitigado
   * por rate limiting (DEV-210).
   */
  async register(input: AuthRegisterRequestBody): Promise<AuthUserView> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const user = await prisma.user.create({
        data: { email: input.email, passwordHash },
        select: PUBLIC_USER_SELECT,
      });

      // Nunca loguear el email ni la contraseña: los logs suelen terminar en
      // sistemas con otro nivel de acceso que la base.
      this.logger.log(`User registrado: ${user.id}`);
      return user;
    } catch (error) {
      // P2002 = violación de constraint único (el índice de `email`): otra
      // request ganó la carrera entre el findUnique de arriba y este insert.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una cuenta con ese email');
      }
      throw error;
    }
  }
}
