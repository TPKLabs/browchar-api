import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import prisma from '@db';
import type {
  AuthLoginRequestBody,
  AuthRegisterRequestBody,
} from '@tpklabs/browchar-contracts';
import type {
  AuthSessionView,
  AuthUserView,
  JwtPayload,
} from '@/common/types/auth.types';
import { hashPassword, verifyPassword } from './password-hasher';

/** Columnas que la API puede exponer de un User: nunca `passwordHash`. */
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  createdAt: true,
} as const;

/**
 * Hash señuelo, usado cuando el email no existe.
 *
 * Sin esto, un email inexistente responde apenas termina el lookup, mientras
 * que uno existente paga además los ~20ms de argon2. Esa diferencia de tiempo
 * es medible desde afuera y permite enumerar cuentas — justo lo que el mensaje
 * de error genérico busca evitar. Verificando siempre contra ALGO, las dos
 * ramas cuestan parecido.
 *
 * Es un hash REAL de 32 bytes aleatorios que nadie conoce (generado una vez,
 * fuera de línea), así que `verify` contra él siempre da false. Tiene que ser
 * un hash argon2 válido: uno inventado haría que `verify` lance una excepción
 * en vez de devolver false, convirtiendo el login fallido en un 500.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$xZLEAjnFkHMadrma/4m6TQ$dIRMjz//e4/I7IntNueNSTKR7r+iFLJxvLv1h7t6FDA';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

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

  /**
   * POST /auth/login.
   *
   * Valida credenciales y emite un JWT.
   *
   * Las dos formas de fallar —email inexistente y contraseña incorrecta—
   * devuelven **el mismo 401 con el mismo mensaje**, y a propósito:
   * distinguirlas le diría a cualquiera si una dirección tiene cuenta en la
   * app. Por eso tampoco se loguea cuál de las dos fue.
   *
   * El mensaje genérico no alcanza solo: si el email no existe salimos sin
   * hashear y respondemos mucho más rápido que cuando sí existe, y esa
   * diferencia de tiempo delata lo mismo que el mensaje callaba. Por eso
   * cuando no hay usuario igual verificamos contra `DUMMY_PASSWORD_HASH`, para
   * que ambos caminos paguen el costo de argon2.
   */
  async login(input: AuthLoginRequestBody): Promise<AuthSessionView> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { ...PUBLIC_USER_SELECT, passwordHash: true },
    });

    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );

    if (!user || !passwordMatches) {
      // Ni el email ni el motivo real van al log: alcanzaría para reconstruir
      // qué direcciones existen a partir de los logs.
      this.logger.warn('Intento de login fallido');
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // `passwordHash` se descarta acá y nunca sale del service.
    const { passwordHash: _passwordHash, ...publicUser } = user;

    return {
      ...this.issueToken(publicUser),
      user: publicUser,
    };
  }

  /**
   * Firma el access token.
   *
   * El payload lleva sólo `sub` (el id del usuario). El contenido de un JWT
   * está firmado pero NO cifrado: cualquiera con el token lo lee en claro, así
   * que meter el email sería publicar un dato personal a cambio de ahorrar un
   * lookup. Lo que el server necesite del usuario lo busca por `sub`.
   */
  private issueToken(user: AuthUserView): {
    accessToken: string;
    expiresIn: number;
  } {
    const payload: JwtPayload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    // `exp` e `iat` los pone la librería al firmar; se leen del token ya
    // emitido en vez de recalcular la duración a mano, así el número que
    // devolvemos no puede divergir de la expiración real del token.
    const { exp, iat } = this.jwtService.decode<{ exp: number; iat: number }>(
      accessToken,
    );

    return { accessToken, expiresIn: exp - iat };
  }
}
