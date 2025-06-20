import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { User } from './schemas/user.schema';
import { ApiResponse, Page } from '../common/interfaces/api-response.interface';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  /**创建 */
  async create(createUserDto: CreateUserDto): Promise<ApiResponse<boolean>> {
    try {
      // 检查用户名是否已存在
      if (createUserDto.name) {
        const existingUser = await this.userModel
          .findOne({ name: createUserDto.name })
          .exec();
        if (existingUser) {
          return {
            code: 500,
            data: false,
            errorMessage: '该用户已存在',
          };
        }
      }

      const createdUser = new this.userModel(createUserDto);
      await createdUser.save();
      return {
        code: 200,
        data: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: false,
        errorMessage: error.message || '创建用户失败',
      };
    }
  }

  /**查所有 */
  async findAll(): Promise<ApiResponse<User[]>> {
    try {
      const users = await this.userModel.find().exec();
      return {
        code: 200,
        data: users,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: [],
        errorMessage: error.message || '查询用户列表失败',
      };
    }
  }

  /**分页查询 */
  async findByPage(pageQuery: PageQueryDto): Promise<ApiResponse<Page<User>>> {
    const { pageNum = 1, pageSize = 10, name, phone } = pageQuery;
    const skip = (pageNum - 1) * pageSize;

    // 构建查询条件
    const query: any = {};
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // i表示不区分大小写
    }
    if (phone) {
      query.phone = { $regex: phone, $options: 'i' };
    }

    try {
      const total = await this.userModel.countDocuments(query).exec();
      const data = await this.userModel
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .exec();
      const totalPages = Math.ceil(total / pageSize);

      return {
        code: 200,
        errorMessage: null,
        data: {
          content: data,
          pageNum,
          pageSize,
          totalElements: total,
          totalPages,
        },
      };
    } catch (error) {
      return {
        code: 500,
        data: {
          content: [],
          pageNum,
          pageSize,
          totalElements: 0,
          totalPages: 0,
        },
        errorMessage: error.message || '分页查询失败',
      };
    }
  }

  /**查一个 */
  async findOne(name: string): Promise<ApiResponse<User | null>> {
    try {
      const user = await this.userModel.findOne({ name }).exec();
      return {
        code: 200,
        data: user,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: error.message || '查询用户失败',
      };
    }
  }

  /**更新 */
  async update(
    name: string,
    updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<boolean>> {
    try {
      await this.userModel.updateOne({ name }, updateUserDto).exec();
      return {
        code: 200,
        data: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: false,
        errorMessage: error.message || '更新用户失败',
      };
    }
  }

  /**删除 */
  async remove(name: string): Promise<ApiResponse<boolean>> {
    try {
      await this.userModel.deleteOne({ name }).exec();
      return {
        code: 200,
        data: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: false,
        errorMessage: error.message || '删除用户失败',
      };
    }
  }
}
