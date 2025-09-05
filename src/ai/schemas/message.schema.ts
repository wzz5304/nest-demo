import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum MessageStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true, type: String })
  conversationId: string;

  @Prop({ required: true, type: Number })
  userId: number;

  @Prop({ required: true, enum: MessageRole, default: MessageRole.USER })
  role: MessageRole;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({ enum: MessageStatus, default: MessageStatus.COMPLETED })
  status: MessageStatus;

  @Prop({ type: Number, default: 0 })
  tokenCount: number;

  @Prop({ type: Number, default: 0 })
  cost: number;

  @Prop({ type: String })
  model: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Number })
  responseTime: number;
}

export const MessageSchema = SchemaFactory.createForClass(Message);