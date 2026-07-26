import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { CharactersModule } from './characters/characters.module';
import { GamesModule } from './games/games.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PlaybooksModule, CharactersModule, GamesModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Validación global de requests (DEV-81): cualquier endpoint cuyo
    // @Body()/@Query() esté tipado con un ZodDto (createZodDto) se valida
    // automáticamente. No hace falta cablear el pipe por ruta.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Envelope estándar de error (DEV-120): normaliza toda excepción al
    // contrato ApiErrorResponse de forma centralizada.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
