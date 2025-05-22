import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Response } from 'express';

@Controller('qr-controller')
export class QrControllerController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
  async getQrCode(@Res() res: Response) {
    try {
      // Wait for QR code with a 30-second timeout
      const qrCodeDataUrl = await this.whatsappService.generateQrCodeDataUrl();

      // Set the content type to image/png
      res.setHeader('Content-Type', 'image/png');

      // Convert base64 data URL to buffer and send
      const base64Data = qrCodeDataUrl.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      res.status(HttpStatus.OK).send(imageBuffer);
    } catch (error) {
      // Log the full error for debugging
      console.error('QR Code Generation Error:', error);

      // Send a more informative error response
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate QR code',
        error: error.message,
        details: 'Make sure the WhatsApp client is initializing correctly',
      });
    }
  }
}
