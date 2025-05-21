import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { User, Payment, Message } from '../schema/schemas';
import { PayloadDto, QrCodeResponseDto, UserDataDto, FormDataDto } from '../dto/dto';

@Injectable()
export class ProcessDataService {
  private readonly abacatePayApiUrl: string;
  private readonly abacatePayToken: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.abacatePayApiUrl = this.configService.get<string>('ABACATE_PAY_API_URL') || 'https://api.abacatepay.com/v1/pixQrCode/create';
    this.abacatePayToken = this.configService.get<string>('ABACATE_PAY_TOKEN') || 'abc_dev_kFPr2jRFG6tek11DaszhKHFp';
  }

  /**
   * Método principal que processa toda a solicitação
   */
  async process(payload: PayloadDto): Promise<QrCodeResponseDto> {
    console.log(payload)
    // Passo 1: Salvar os dados do usuário e obter user_id
    const user = await this.passo1SalvarUsuario(payload.userData);
    
    // Passo 2: Gerar QR Code PIX com AbacatePay
    const payment = await this.passo2GerarQrCodePix(user.user_id, payload.userData);
    console.log(payment)
    
    // Passo 3: Salvar informações do formData
    const mensagem = await this.passo3SalvarDadosMensagem(user.user_id, payload.formData);
    
    // Passo 4: Retornar o QR Code e copia cola
    return this.passo4RetornarQrCode(payment, mensagem);
  }

  /**
   * Passo 1: Salvar os dados do usuário no MongoDB e obter user_id
   */
  private async passo1SalvarUsuario(userData: UserDataDto): Promise<User> {
    const user = new this.userModel(userData);
    return await user.save();
  }

  /**
   * Passo 2: Gerar QR Code PIX com AbacatePay e salvar resultado
   */
  private async passo2GerarQrCodePix(user_id: string, userData: UserDataDto): Promise<Payment> {
    // Preparar dados para requisição ao AbacatePay
    const amount = 100; // Valor fixo ou dinâmico conforme necessário
    const expiresIn = 3600; // 1 hora de expiração
    const description = "Mensagens para destinatário";

    // Fazer requisição para AbacatePay
    let pixQrCodeResponse;
    try {
      const { data, status } = await lastValueFrom(
        this.httpService.post(`${this.abacatePayApiUrl}`, {
          amount,
          expiresIn,
          description,
          customer: {
            name: userData.nome,
            cellphone: userData.celular,
            email: userData.email,
            taxId: userData.taxId,
          },
        }, {
          headers: {
            'Authorization': `Bearer ${this.abacatePayToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (status !== 200) {
        throw new HttpException('Desculpe, não conseguimos gerar o QrCode no momento', HttpStatus.BAD_REQUEST);
      }
      
      pixQrCodeResponse = data;
    } catch (error) {
      throw new HttpException('Desculpe, não conseguimos gerar o QrCode no momento', HttpStatus.BAD_REQUEST);
    }

    // Salvar dados do pagamento
    const payment = new this.paymentModel({
      user_id,
      amount,
      expiresIn,
      description,
      brCode: pixQrCodeResponse.data.brCode,
      brCodeBase64: pixQrCodeResponse.data.brCodeBase64,
      status: pixQrCodeResponse.data.status,
      id_compra: pixQrCodeResponse.data.id,
      abacatePayResponse: pixQrCodeResponse,
    });

    return await payment.save();
  }

  /**
   * Passo 3: Salvar informações do formData com id_compra
   */
  private async passo3SalvarDadosMensagem(id_user: string, formData: FormDataDto): Promise<Message> {
    const messageData = {
      id_user,
      nomeDestinario: formData.nomeDestinario,
      numeroDestinario: formData.numeroDestinario,
      mensagem: formData.mensagem,
    };

    const message = new this.messageModel(messageData);
    return await message.save();
  }

  /**
   * Passo 4: Retornar QR Code e copia cola para o cliente
   */
  private passo4RetornarQrCode(payment: Payment, mensagem: Message): QrCodeResponseDto {
    return {
      id_mensagem: mensagem.id_mensagem,
      brCode: payment.brCode,
      brCodeBase64: payment.brCodeBase64,
    };
  }
}