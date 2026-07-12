import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { CharactersModule } from './characters/characters.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [PlaybooksModule, CharactersModule, GamesModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Validación global de requests (DEV-81): cualquier endpoint cuyo
    // @Body()/@Query() esté tipado con un ZodDto (createZodDto) se valida
    // automáticamente. No hace falta cablear el pipe por ruta.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
