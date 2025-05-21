import { Controller, Post, Body, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ProcessWebHookService } from '../service/process-webhook.service';
import { PayloadDto, QrCodeResponseDto } from '../dto/dto';

@Controller('api')
export class ProcessDataController {
  constructor(private readonly processWebHookService: ProcessWebHookService) {}

  @Post('webhook')
  async processData(@Body() payload: any,
                    @Query('webhookSecret') webhookSecret: string,): Promise<string> {
    try {
      //return await this.processWebHookService.process(payload);

      console.log(webhookSecret)
      console.log(payload)
      return '';
    } catch (error) {
        console.log('deu merda')
      throw new HttpException(
        error.message || 'Desculpe, não conseguimos processar sua solicitação',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}