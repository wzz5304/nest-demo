import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';

@Controller('users')
@UseInterceptors(TransformInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createProfile(@Body() createProfileDto: CreateProfileDto) {
    return this.usersService.createProfile(createProfileDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post('/page')
  findByPage(@Body() pageQuery: PageQueryDto) {
    return this.usersService.findByPage(pageQuery);
  }

  @Get(':userId')
  getProfile(@Param('userId') userId: number) {
    return this.usersService.getProfile(userId);
  }

  @Post('/update')
  updateProfile(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(updateUserDto);
  }

  @Delete(':userId')
  remove(@Param('userId') userId: number) {
    return this.usersService.remove(userId);
  }
}
