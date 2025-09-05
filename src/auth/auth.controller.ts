import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from './schemas/user-auth.schema';

@UseInterceptors(TransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/register')
  register(@Body() registerAuthDto: RegisterAuthDto) {
    return this.authService.register(registerAuthDto);
  }

  @Public()
  @Post('/login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto);
  }

  // 登出
  @Post('/logout')
  logout(@Req() req: Request) {
    const user = req.user;
    return this.authService.logout(user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('/page')
  getAccount(@Body() pageQueryDto: PageQueryDto) {
    return this.authService.getAccount(pageQueryDto);
  }
}
