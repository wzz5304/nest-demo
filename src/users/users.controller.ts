import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  // ParseIntPipe,
  // HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { ExcludeNullInterceptor } from '../common/interceptor/excludenull.interceptor';
import { TimeoutInterceptor } from '../common/interceptor/timeout.interceptor';

@UseInterceptors(ExcludeNullInterceptor, TimeoutInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('/details')
  findAll() {
    const res = this.usersService.findAll();
    return res;
  }

  @Post('/page')
  findByPage(@Body() pageQuery: PageQueryDto) {
    return this.usersService.findByPage(pageQuery);
  }

  @Get('/details/:name')
  findOne(
    @Param(
      'name',
      // new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }),
    )
    name: string,
  ) {
    return this.usersService.findOne(name);
  }

  @Patch('/update/:name')
  update(@Param('name') name: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(name, updateUserDto);
  }

  @Delete('/del/:name')
  remove(@Param('name') name: string) {
    return this.usersService.remove(name);
  }
}
