import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsPhoneNumber,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  id?: number;

  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(2, 20, { message: '用户名长度应在2-20个字符之间' })
  name: string;

  @IsOptional()
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  phone?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}
