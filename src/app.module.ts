import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { CharactersModule } from './characters/characters.module';

@Module({
  imports: [PlaybooksModule, CharactersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
