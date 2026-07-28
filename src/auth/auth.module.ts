import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '@/config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    // El secreto y la expiración se configuran una sola vez acá; `env.ts` ya
    // validó al arrancar que el secreto existe y tiene largo suficiente, así
    // que un despliegue mal configurado falla al bootear y no al primer login.
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Guard GLOBAL (DEV-88): la API queda protegida por default y abrirse es
    // explícito vía `@Public()`. Al revés —proteger ruta por ruta— olvidarse
    // del guard deja un endpoint abierto sin que nada lo delate; así,
    // olvidarse devuelve 401 y se nota en el primer request.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
