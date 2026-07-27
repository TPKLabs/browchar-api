import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.schemas';

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

  /**
   * 200, no 201: login no crea ningún recurso, sólo emite un token sobre
   * credenciales existentes. Sin este `@HttpCode`, Nest devolvería 201 por ser
   * un POST.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
