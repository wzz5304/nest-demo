import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserAuth } from './schemas/user-auth.schema';
import { Counter } from './schemas/counter.schema';
import { ApiResponse, Page } from '../common/interfaces/api-response.interface';
import { UsersService } from '../users/users.service';
import { PageQueryDto } from './dto/page-query.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserAuth.name) private userAuthModel: Model<UserAuth>,
    @InjectModel(Counter.name) private counterModel: Model<Counter>,
    private usersService: UsersService,
  ) {}

  /**获取自增ID */
  private async getNextSequence(modelName: string): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { model_name: modelName },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }

  /**注册 */
  async register(
    registerAuthDto: RegisterAuthDto,
  ): Promise<ApiResponse<UserAuth | null>> {
    try {
      // 检查用户名是否已存在
      const existingUsername = await this.userAuthModel
        .findOne({ username: registerAuthDto.username })
        .exec();
      if (existingUsername) {
        return {
          code: 400,
          data: null,
          errorMessage: '该用户名已存在',
        };
      }

      // 检查邮箱是否已存在
      const existingEmail = await this.userAuthModel
        .findOne({ email: registerAuthDto.email })
        .exec();
      if (existingEmail) {
        return {
          code: 400,
          data: null,
          errorMessage: '该邮箱已被注册',
        };
      }

      // 如果提供了手机号，检查手机号是否已存在
      if (registerAuthDto.phone) {
        const existingPhone = await this.userAuthModel
          .findOne({ phone: registerAuthDto.phone })
          .exec();
        if (existingPhone) {
          return {
            code: 400,
            data: null,
            errorMessage: '该手机号已被注册',
          };
        }
      }

      // 对密码进行MD5加密
      const hashedPassword = crypto
        .createHash('md5')
        .update(registerAuthDto.password)
        .digest('hex');

      // 获取自增ID
      const userId = await this.getNextSequence(UserAuth.name);

      // 创建用户认证对象
      const userToCreate = {
        ...registerAuthDto,
        password_hash: hashedPassword,
        id: userId,
      };

      // 删除明文密码
      delete userToCreate.password;

      const createdUser = new this.userAuthModel(userToCreate);
      await createdUser.save();

      // 创建用户资料
      await this.usersService.createProfile({
        user_id: createdUser.id, // 使用自增 ID
        phone: registerAuthDto.phone,
        email: registerAuthDto.email,
      });

      // 返回用户信息（不包含密码哈希）
      const userWithoutPassword = createdUser.toObject();
      delete userWithoutPassword.password_hash;

      return {
        code: 200,
        data: userWithoutPassword,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: `注册失败: ${error.message}`,
      };
    }
  }

  /**登录 */
  async login(
    loginAuthDto: LoginAuthDto,
  ): Promise<ApiResponse<UserAuth | null>> {
    try {
      // 查找用户
      const user = await this.userAuthModel
        .findOne({ username: loginAuthDto.username })
        .exec();

      if (!user) {
        return {
          code: 404,
          data: null,
          errorMessage: '用户不存在',
        };
      }

      // 对输入的密码进行MD5加密
      const hashedPassword = crypto
        .createHash('md5')
        .update(loginAuthDto.password)
        .digest('hex');

      // 验证密码
      if (user.password_hash !== hashedPassword) {
        return {
          code: 401,
          data: null,
          errorMessage: '密码错误',
        };
      }

      // 更新最后登录时间
      user.last_login_at = new Date();
      await user.save();

      // 登录成功，返回用户信息（不包含密码哈希）
      const userWithoutPassword = user.toObject();
      delete userWithoutPassword.password_hash;

      return {
        code: 200,
        data: userWithoutPassword,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: `登录失败: ${error.message}`,
      };
    }
  }

  async getAccount(
    pageQuery: PageQueryDto,
  ): Promise<ApiResponse<Page<UserAuth>>> {
    try {
      const { pageNum = 1, pageSize = 10, ...rest } = pageQuery;
      const skip = (pageNum - 1) * pageSize;

      const query = {};
      // 构建查询条件
      Object.keys(rest).forEach((key) => {
        if (rest[key]) {
          if (typeof rest[key] === 'string') {
            query[key] = { $regex: rest[key], $options: 'i' };
          } else {
            query[key] = rest[key];
          }
        }
      });

      const total = await this.userAuthModel.countDocuments(query).exec();
      const profiles = await this.userAuthModel
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .exec();

      const totalPages = Math.ceil(total / pageSize);

      return {
        code: 200,
        data: {
          content: profiles,
          pageNum,
          pageSize,
          totalElements: total,
          totalPages,
        },
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: {
          content: [],
          pageNum: 1,
          pageSize: 10,
          totalElements: 0,
          totalPages: 0,
        },
        errorMessage: `分页查询用户资料失败: ${error.message}`,
      };
    }
  }
}
