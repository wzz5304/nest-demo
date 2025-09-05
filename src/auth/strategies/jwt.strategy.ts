import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../schemas/user-auth.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(UserAuth.name) private userAuthModel: Model<UserAuth>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your_jwt_secret_key', // 在实际应用中，应该使用环境变量存储密钥
    });
  }

  async validate(payload: any) {
    // payload 是 JWT 解码后的内容，包含我们在 sign 时放入的数据
    const { sub: userId } = payload;

    // 根据 payload 中的用户 ID 查找用户
    const user = await this.userAuthModel.findOne({ id: userId }).exec();

    if (!user) {
      throw new UnauthorizedException('用户不存在或未授权');
    }

    // 返回用户信息（不包含密码），将被添加到请求对象中
    const userInfo = user.toObject();
    delete userInfo.password_hash;

    return userInfo;
  }
}
