import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Document } from 'mongoose';

export type UserProfileDocument = HydratedDocument<UserProfile>;

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Schema()
export class UserProfile extends Document {
  @Prop({
    type: Number,
    ref: 'UserAuth',
    required: true,
    unique: true,
  })
  user_id: number;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop()
  full_name: string;

  @Prop()
  avatar_url: string;

  @Prop()
  address: string;

  @Prop({ type: Date })
  birthday: Date;

  @Prop({ type: String, enum: Gender })
  gender: Gender;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
