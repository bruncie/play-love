import { Controller, Post, Body, HttpException, HttpStatus, Get, Param } from '@nestjs/common';
import { ProcessDataService } from '../service/process-data.service';
import { PayloadDto, QrCodeResponseDto } from '../dto/dto';

@Controller('api')
export class ProcessDataController {
  constructor(private readonly processDataService: ProcessDataService) { }

  @Post('messages')
  async processData(@Body() payload: PayloadDto): Promise<QrCodeResponseDto> {
    try {
      return await this.processDataService.processPayload(payload);
    } catch (error) {
      throw new HttpException(
        error.message || 'Desculpe, não conseguimos processar sua solicitação',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getStatus(@Param('id') id: string): Promise<string> {
    try {
      return await this.processDataService.getStatus(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Desculpe, não conseguimos processar sua solicitação',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}