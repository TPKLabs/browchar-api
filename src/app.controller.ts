import { Controller, Get } from '@nestjs/common';
import { Public } from '@/auth/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Healthcheck. Público de forma permanente: Railway lo consulta sin
   * credenciales para saber si el servicio está vivo (DEV-164).
   */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
