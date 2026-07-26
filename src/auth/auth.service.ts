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
   */
  async register(input: AuthRegisterRequestBody): Promise<AuthUserView> {
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
      // P2002 = violación de constraint único (el índice de `email`).
      //
      // Se resuelve por la excepción de Prisma y no con un findUnique previo a
      // propósito: entre el chequeo y el insert hay una ventana en la que otra
      // request puede crear el mismo email, y el índice de Postgres es el único
      // árbitro sin esa carrera.
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
