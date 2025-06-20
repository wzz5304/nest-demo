import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop()
  sex: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop()
  email: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
