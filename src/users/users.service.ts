import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { UserProfile } from './schemas/user-profile.schema';
import { ApiResponse, Page } from '../common/interfaces/api-response.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserProfile.name) private userProfileModel: Model<UserProfile>,
  ) {}

  /**创建用户资料 */
  async createProfile(
    createProfileDto: CreateProfileDto,
  ): Promise<ApiResponse<UserProfile | null>> {
    try {
      // 检查用户资料是否已存在
      const existingProfile = await this.userProfileModel
        .findOne({ user_id: createProfileDto.user_id })
        .exec();

      if (existingProfile) {
        return {
          code: 400,
          data: null,
          errorMessage: '用户资料已存在',
        };
      }

      // 创建用户资料
      const createdProfile = new this.userProfileModel(createProfileDto);
      await createdProfile.save();

      return {
        code: 200,
        data: createdProfile,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: `创建用户资料失败: ${error.message}`,
      };
    }
  }

  /**获取用户资料 */
  async getProfile(userId: number): Promise<ApiResponse<UserProfile | null>> {
    try {
      const profile = await this.userProfileModel
        .findOne({ user_id: userId })
        .exec();

      if (!profile) {
        return {
          code: 404,
          data: null,
          errorMessage: '用户资料不存在',
        };
      }

      return {
        code: 200,
        data: profile,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: `获取用户资料失败: ${error.message}`,
      };
    }
  }

  /**更新用户资料 */
  async updateProfile(
    updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserProfile | null>> {
    const { user_id } = updateUserDto;
    try {
      const updatedProfile = await this.userProfileModel
        .findOneAndUpdate({ user_id }, updateUserDto, { new: true })
        .exec();

      if (!updatedProfile) {
        return {
          code: 404,
          data: null,
          errorMessage: '用户资料不存在',
        };
      }

      return {
        code: 200,
        data: updatedProfile,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: null,
        errorMessage: `更新用户资料失败: ${error.message}`,
      };
    }
  }

  /**获取所有用户资料 */
  async findAll(): Promise<ApiResponse<UserProfile[]>> {
    try {
      const profiles = await this.userProfileModel.find().exec();
      return {
        code: 200,
        data: profiles,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: [],
        errorMessage: `获取所有用户资料失败: ${error.message}`,
      };
    }
  }

  /**分页查询用户资料 */
  async findByPage(
    pageQuery: PageQueryDto,
  ): Promise<ApiResponse<Page<UserProfile>>> {
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

      const total = await this.userProfileModel.countDocuments(query).exec();
      const profiles = await this.userProfileModel
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

  /**删除用户资料 */
  async remove(userId: number): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.userProfileModel
        .deleteOne({ user_id: userId })
        .exec();

      if (result.deletedCount === 0) {
        return {
          code: 404,
          data: false,
          errorMessage: '用户资料不存在',
        };
      }

      return {
        code: 200,
        data: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        code: 500,
        data: false,
        errorMessage: `删除用户资料失败: ${error.message}`,
      };
    }
  }
}
