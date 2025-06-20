import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsPhoneNumber,
  MinLength,
  Length,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../schemas/user-auth.schema';

export class RegisterAuthDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(2, 20, { message: '用户名长度应在6-15个字符之间' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  @IsString()
  password: string;

  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsOptional()
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是 user 或 admin' })
  role?: UserRole;
}
