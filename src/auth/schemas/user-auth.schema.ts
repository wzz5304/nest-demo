import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Document } from 'mongoose';

export type UserAuthDocument = HydratedDocument<UserAuth>;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema()
export class UserAuth extends Document {
  @Prop({ type: Number, unique: true })
  id: number;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop()
  last_login_at: Date;
}

export const UserAuthSchema = SchemaFactory.createForClass(UserAuth);
