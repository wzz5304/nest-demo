import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';

@UseInterceptors(TransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  register(@Body() registerAuthDto: RegisterAuthDto) {
    return this.authService.register(registerAuthDto);
  }

  @Post('/login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto);
  }

  @Post('/page')
  getAccount(@Body() pageQueryDto: PageQueryDto) {
    return this.authService.getAccount(pageQueryDto);
  }
}
