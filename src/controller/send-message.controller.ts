import { Body, Controller, Post } from '@nestjs/common';
import { SendMessageService } from '../service/send-message.service';
import { SendMessageDto } from '../dto/send-message.dto';

@Controller('send-message')
export class SendMessageController {
  constructor(private readonly sendMessageService: SendMessageService) {}

  @Post()
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.sendMessageService.sendMessage(dto);
  }
}
