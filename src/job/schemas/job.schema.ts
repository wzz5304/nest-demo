import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JobDocument = HydratedDocument<Job>;

@Schema()
export class Job {
  @Prop({ required: true })
  id: number;

  @Prop()
  name: string;

  @Prop()
  area: string;

  @Prop()
  salary: string;

  @Prop()
  link: string;
  @Prop()
  company: string;
  @Prop()
  desc: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);
