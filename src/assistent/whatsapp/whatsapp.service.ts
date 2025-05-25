/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { Client, RemoteAuth } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';
import { Subject } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { Debouncer, MessageQueueItem } from './debouncer';
import { WhatsappSessionStoreService } from './whatsappSessionStore';
import { WhatsappFormatter } from './whatsappFormater.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private currentQrCode: string | null = null;
  private qrCodeSubject = new Subject<string>();
  private readonly tempDir = path.join(process.cwd(), 'temp');
  private readonly logger = new Logger(WhatsappService.name);
  private readonly client: Client;
  private readonly formatter: WhatsappFormatter;
  private readonly debouncer: Debouncer;

  constructor(
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    private readonly sessionStore: WhatsappSessionStoreService,
    private readonly configService: ConfigService,
  ) {
    this.formatter = new WhatsappFormatter();
    this.debouncer = new Debouncer();
    this.client = this.initializeClient();
    this.setupEventListeners();
  }

  onModuleInit(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    this.initializeWhatsapp();
  }

  private initializeClient(): Client {
    const clientId =
      this.configService.get<string>('WHATSAPP_CLIENT_ID') || 'whatsapp-client';

    this.logger.log(`Inicializando cliente WhatsApp com ID: ${clientId}`);

    return new Client({
      authStrategy: new RemoteAuth({
        clientId,
        store: this.sessionStore,
        backupSyncIntervalMs: 60_000,
      }),
      puppeteer: {
        headless: true, // Forçar modo headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process', // Importante para alguns ambientes serverless
          '--disable-extensions',
          '--disable-infobars',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--use-gl=egl', // Melhora performance no modo headless
        ].filter(Boolean),
      },
    });
  }

  private initializeWhatsapp(): void {
    try {
      this.client.initialize();
    } catch (error) {
      this.logger.error('Erro ao inicializar WhatsApp:', error);
      throw new Error('Falha ao inicializar cliente WhatsApp');
    }
  }

  private setupEventListeners(): void {
    this.setupQRCodeListener();
    this.setupReadyListener();
    this.setupMessageListener();
  }

  private setupQRCodeListener(): void {
    this.client.on('qr', (qr) => {
      this.logger.log('Escaneie o QR Code para conectar:');
      this.currentQrCode = qr;
      this.qrCodeSubject.next(qr);
      this.logger.log('QR Code gerado:', this.currentQrCode);
      // qrcode.generate(qr, { small: true });
    });
  }

  public async waitForQrCode(): Promise<string> {
    this.logger.log('Aguardando QR Code...');
    return new Promise((resolve, reject) => {
      if (this.currentQrCode) {
        return resolve(this.currentQrCode);
      }

      const subscription = this.qrCodeSubject.subscribe({
        next: (qr) => {
          subscription.unsubscribe();
          resolve(qr);
        },
        error: (err) => {
          subscription.unsubscribe();
          reject(err);
        },
      });
    });
  }

  public async generateQrCodeDataUrl(): Promise<string> {
    this.logger.log('Gerando QR Code Data URL...');
    try {
      const qrCode = this.currentQrCode || (await this.waitForQrCode());

      this.logger.log('QR Code Data URL...', qrCode);

      const qrCodeDataUrl = await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 400,
        margin: 2,
      });

      this.logger.log('QR Code ...', qrCodeDataUrl);

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error('Failed to generate QR code data URL', error);
      throw new Error('Could not generate QR code: ' + error.message);
    }
  }

  private setupReadyListener(): void {
    this.client.on('ready', () => {
      this.logger.log('WhatsApp Web conectado com sucesso!');
    });
  }

  private setupMessageListener(): void {
    this.client.on('message', async (message) => {
      try {
        this.logger.log(
          `Mensagem recebida de ${message.from}: ${message.body}`,
        );

        const cleanPhone = this.formatter.cleanPhoneNumber(message.from);
        const messageItem: MessageQueueItem = { message };

        this.debouncer.enqueue(cleanPhone, messageItem, (items) =>
          this.processQueuedMessages(cleanPhone, items),
        );
      } catch (error) {
        this.logger.error(`Erro ao processar mensagem: ${error.message}`);
        message.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
      }
    });
  }

  private async processQueuedMessages(
    phone: string,
    items: MessageQueueItem[],
  ): Promise<void> {
    this.logger.log(
      `Processando lote de ${items.length} mensagens para o telefone ${phone}`,
    );
    try {
      let combinedText = '';
      if (items.length === 0) return;

      // Processa cada item da fila
      for (const item of items) {
        combinedText += `${item.message.body}\n`;
      }

      combinedText = combinedText.trim();
      await this.aiService.processMessage(phone, combinedText);
    } catch (error) {
      this.logger.error(
        `Erro ao processar lote de mensagens: ${error.message}`,
      );
      if (items.length > 0 && items[0].message) {
        items[0].message.reply(
          'Desculpe, ocorreu um erro ao processar suas mensagens.',
        );
      }
    }
  }

  private handleSendMessageError(number: string, error: Error): void {
    const errorMessage = `Não foi possível enviar a mensagem para ${number}`;
    this.logger.error(errorMessage, error.stack);
    throw new Error(`${errorMessage}. Erro: ${error.message}`);
  }

  public async sendMessage(number: string, message: string): Promise<void> {
    try {
      this.logger.log(`numero: ${number}`);
      const formattedNumber = this.formatter.formatPhoneNumber(number);
      this.logger.log(`formattedNumber: ${formattedNumber}`);
      this.logger.debug(`Enviando mensagem para: ${formattedNumber}`);

      const response = await this.client.sendMessage(formattedNumber, message);
      this.logger.log('Mensagem enviada com sucesso:', response);
    } catch (error) {
      this.handleSendMessageError(number, error);
    }
  }
}
