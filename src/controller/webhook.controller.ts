import { Controller, Post, Body, HttpException, HttpStatus, Query, HttpCode, Param } from '@nestjs/common';
import { ProcessWebHookService } from '../service/process-webhook.service';
import { PayloadDto, QrCodeResponseDto } from '../dto/dto';

@Controller('api')
export class WebhookController {
  constructor(private readonly processWebHookService: ProcessWebHookService) { }

  @Post('webhook')
  @HttpCode(HttpStatus.NO_CONTENT)
  async processData(@Body() payload: any): Promise<void> {
      //@Query('webhookSecret') webhookSecret: string,): Promise<void> {
    try {
      //this.validaPayloadSecret(payload, webhookSecret);
      console.log('#############################################################');
      console.log('payload recebido', payload);
      this.processWebHookService.processWebHook(payload);

    } catch (error) {
      console.log('deu merda')
      throw new HttpException(
        error.message || 'Desculpe, não conseguimos processar sua solicitação',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  validaPayloadSecret(payload: any, webhookSecret: string): void {
    if (!payload) {
      throw new HttpException('Payload não informado', HttpStatus.UNAUTHORIZED);
    }

    if (!webhookSecret) {
      throw new HttpException('Webhook Secret não informado', HttpStatus.UNAUTHORIZED);
    }

    if (webhookSecret !== process.env.ABACATE_PAY_WEBHOOK_SECRET_CATLOVE) {
      throw new HttpException('Webhook Secret inválido', HttpStatus.UNAUTHORIZED);
    }
  }
}