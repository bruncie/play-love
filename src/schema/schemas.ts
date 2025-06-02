import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

//USER SCHEMA
@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  celular: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  taxId: string;

  @Prop({ default: () => uuidv4() })
  user_id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

//PAYMENT SCHEMA
@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  id_compra: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  expiresAt: string;

  @Prop({ required: true })
  brCode: string;

  @Prop({ required: true })
  brCodeBase64: string;

  @Prop({ required: true })
  status: string;
  
  @Prop({ type: Object })
  abacatePayResponse: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

//MESSAGE SCHEMA
@Schema({ timestamps: true })
export class Message extends Document {

  @Prop({ default: () => uuidv4() })  //gerador de id
  id_mensagem: string;

  @Prop({ required: true })
  id_user: string;

  @Prop({ required: true })
  nomeDestinario: string;

  @Prop({ required: true })
  numeroDestinario: string;

  @Prop({ required: true })
  mensagem: string;

  @Prop({ required: true })
  status_message: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);