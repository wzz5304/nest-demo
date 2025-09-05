import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserAuth } from './schemas/user-auth.schema';
import { Counter } from './schemas/counter.schema';
import { ApiResponse, Page } from '../common/interfaces/api-response.interface';
import { UsersService } from '../users/users.service';
import { PageQueryDto } from './dto/page-query.dto';
import { LoginResponse } from './interfaces/login-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserAuth.name) private userAuthModel: Model<UserAuth>,
    @InjectModel(Counter.name) private counterModel: Model<Counter>,
    private usersService: UsersService,
    private jwtService: JwtService,
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
        data: userWithoutPassword as any,
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
  ): Promise<ApiResponse<LoginResponse | null>> {
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

      // 生成 JWT token
      const payload = {
        sub: user.id,
        username: user.username,
        role: user.role,
      };
      const token = this.jwtService.sign(payload);

      // 登录成功，返回用户信息和 token
      const userWithoutPassword = user.toObject();
      delete userWithoutPassword.password_hash;

      return {
        code: 200,
        data: {
          user: userWithoutPassword as any,
          access_token: token,
        },
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

  /**登出 */
  async logout(user: any): Promise<ApiResponse<null>> {
    try {
      // 在JWT认证中，服务器端通常不存储token状态
      // 真正的登出逻辑应该在客户端删除token
      // 这里可以实现一些服务器端的清理工作，例如：

      if (user && user.id) {
        // 1. 记录用户登出时间
        const userAuth = await this.userAuthModel
          .findOne({ id: user.id })
          .exec();
        if (userAuth) {
          // 记录用户最后登出时间
          userAuth.last_logout_at = new Date();
          await userAuth.save();
          console.log(
            `用户 ${user.username} (ID: ${user.id}) 已登出，登出时间: ${userAuth.last_logout_at}`,
          );
        }

        // 2. 将当前token加入黑名单（需要额外实现token黑名单存储）
        // 3. 清除服务器端的会话数据（如果有）
      }

      return {
        code: 200,
        data: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: `登出失败: ${error.message}`,
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
