import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlaybooksModule } from './playbooks/playbooks.module';

@Module({
  imports: [PlaybooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
