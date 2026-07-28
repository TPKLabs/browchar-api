import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '@/common/types/auth.types';

/**
 * Inyecta el actor autenticado en un handler.
 *
 * ```ts
 * @Get('me')
 * me(@CurrentUser() user: AuthPrincipal) { ... }
 * ```
 *
 * Devuelve `AuthPrincipal` y no `AuthPrincipal | undefined` porque tira 401 si
 * no hay actor. Ese caso sólo ocurre si el handler está marcado `@Public()` y
 * aun así pide el usuario — o sea, un error de programación, no un request mal
 * formado. Fallar ahí es preferible a devolver `undefined` y que termine
 * filtrándose como `ownerId: undefined` en una query, que no scopea nada.
 *
 * El actor NUNCA se toma del body ni de un query param: viene del token
 * validado por el guard y de ningún otro lado (`docs/architecture/data-ownership.md`).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    return request.user;
  },
);
