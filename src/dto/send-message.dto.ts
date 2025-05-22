import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  senderName: string;

  @IsString()
  senderPhone: string;

  @IsString()
  senderMessage: string;

  @IsString()
  recipientName: string;

  @IsString()
  recipientPhone: string;
}
