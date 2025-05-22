// conversation/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UserConversation {
  userId: string;
  messages: ConversationMessage[];
  lastActivity: Date;
}

export type UserConversationDocument = HydratedDocument<UserConversationModel>;

@Schema({ timestamps: true })
export class UserConversationModel extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: Array, default: [] })
  messages: ConversationMessage[];

  @Prop({ default: Date.now })
  lastActivity: Date;
}

export const UserConversationSchema = SchemaFactory.createForClass(
  UserConversationModel,
);
UserConversationSchema.index({ lastActivity: 1 });
