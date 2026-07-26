import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './auth.schemas';

/**
 * Rutas del recurso Auth.
 *
 * La validación de la forma del request la aplica el pipe global de nestjs-zod
 * (registrado en AppModule) sobre los DTOs `createZodDto`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
