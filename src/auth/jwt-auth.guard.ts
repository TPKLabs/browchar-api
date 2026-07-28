import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthPrincipal, JwtPayload } from '@/common/types/auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Guard global de autenticación (DEV-88).
 *
 * Valida el `Authorization: Bearer <token>` y deja el actor en `req.user`.
 * Las rutas que no lo necesitan se marcan con `@Public()`.
 *
 * **No consulta la base.** El principal sale del token y nada más: agregar un
 * lookup por request encarecería TODOS los endpoints para cubrir un caso que
 * hoy no existe (no hay baja de usuarios). La consecuencia, que conviene tener
 * presente: si un usuario se borrara, su token seguiría siendo válido hasta
 * que expire. Cuando exista esa baja hay que revisar esta decisión — el
 * endpoint que sí necesita el usuario completo (`/auth/me`, DEV-86) lo busca
 * por `sub`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // `getAllAndOverride` mira el handler y después la clase: así una ruta
    // puede abrirse sin abrir el controller entero.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    let payload: JwtPayload;
    try {
      // `verifyAsync` valida firma Y expiración. Nunca usar `decode` acá:
      // decodifica sin verificar nada, así que aceptaría un token con la firma
      // falsificada — que es exactamente lo que este guard existe para impedir.
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      // Un solo mensaje para firma inválida, token vencido y token con formato
      // roto: al cliente no le sirve la diferencia y no hay motivo para
      // describirle a un atacante por qué su token no pasó.
      throw new UnauthorizedException('Token de autenticación inválido');
    }

    if (typeof payload?.sub !== 'string' || payload.sub.length === 0) {
      // Un token bien firmado pero sin `sub` usable no identifica a nadie.
      // Sólo puede venir de un emisor nuestro roto, pero dejarlo pasar
      // significaría seguir con `userId` undefined hacia las queries.
      throw new UnauthorizedException('Token de autenticación inválido');
    }

    const principal: AuthPrincipal = { userId: payload.sub };
    request.user = principal;

    return true;
  }
}

/**
 * Extrae el token de un header `Authorization`.
 *
 * Exige el esquema `Bearer` explícito y un único espacio: aceptar el token
 * pelado o cualquier esquema haría que un `Basic <base64>` entrara por esta
 * puerta.
 */
function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const [scheme, token, ...rest] = header.split(' ');

  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    return undefined;
  }

  return token;
}
