import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  /**导出UsersService 其他引用的模块可以使用 UsersService */
  exports: [UsersService],
})
export class UsersModule {}
