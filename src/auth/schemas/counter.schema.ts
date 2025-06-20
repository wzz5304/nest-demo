import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Document } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

@Schema()
export class Counter extends Document {
  @Prop({ required: true, unique: true })
  model_name: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
