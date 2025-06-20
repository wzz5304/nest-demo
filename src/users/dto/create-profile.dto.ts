import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';
import { Gender } from '../schemas/user-profile.schema';

export class CreateProfileDto {
  @IsString()
  user_id: number;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsOptional()
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  phone?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsEnum(Gender, { message: '性别必须是 male、female 或 other' })
  gender?: Gender;
}
