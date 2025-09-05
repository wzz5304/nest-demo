import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ required: true, type: Number })
  userId: number;

  @Prop({ required: true, type: String, default: '新对话' })
  title: string;

  @Prop({ type: String })
  model: string;

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  @Prop({ type: Date })
  lastMessageAt: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: String })
  summary: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);