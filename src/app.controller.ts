import { Controller, Get, Redirect, Query, Res } from '@nestjs/common';
import { Response } from 'express';

import { AppService } from './app.service';
import { UsersService } from './users/users.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('docs')
  @Redirect('https://nest.nodejs.cn', 302)
  getDocs(@Query('version') version, @Res() res: Response) {
    if (version && version === '5') {
      return; // 使用 @Redirect 返回重定向的 URL
    }
    res.status(200).send({
      code: 200,
      data: version,
    });
  }
}
