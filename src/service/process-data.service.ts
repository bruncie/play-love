import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Payment, Message } from '../schema/schemas';
import {
  PayloadDto,
  QrCodeResponseDto,
  UserDataDto,
  FormDataDto,
} from '../dto/dto';
import { PagarmeService } from './pagarme.service';

@Injectable()
export class ProcessDataService {
  private readonly logger = new Logger(ProcessDataService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly pagarmeService: PagarmeService,
  ) {}

  /**
   * Processa o payload recebido
   * @param payload Dados do usuário e mensagem
   * @returns QrCode gerado
   */
  async processPayload(payload: PayloadDto): Promise<QrCodeResponseDto> {
    const user = await this.salvaUsuario(payload.userData);
    const payment = await this.geraQrCodePix(user.user_id, payload.userData);
    const mensagem = await this.salvaDadosMensagem(user.user_id, payload.formData, 'PENDING');
    return this.retornaQrCode(payment, mensagem);
  }

  /**
   * Envia uma mensagem para o WhatsApp
   * Obs: Usuário já pagou e tem rate_limit > 0
   * @param payload Dados do usuário e mensagem
   * @returns rate_Limit
   */
  async sendMessage(payload: PayloadDto): Promise<number> {
    try {
      const user = await this.findOneByFilters(payload.userData);

      if (user == null) {
        throw new Error('Usuário não encontrado');
      }

      if (user.rate_limit <= 0) {
        throw new Error('Saldo insuficiente para enviar mensagem');
      }

      // Envia a mensagem para o WhatsApp 
      // await this.whatsappService.sendMessage(mensagem.numeroDestinario, mensagem.mensagem); 

      // Atualiza o rate_limit do usuário 
      user.rate_limit -= 1;
      await user.save();

      // Salva a mensagem 
      await this.salvaDadosMensagem(user.user_id, payload.formData, 'SENT');

      return user.rate_limit;

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      throw error;
    }
  }

  private async findOneByFilters(filters: UserDataDto): Promise<User | null> {
    const query: any = {};

    query.celular = filters.celular;
    query.email = filters.email;
    query.taxId = filters.taxId;

    return this.userModel.findOne(query).exec();
  }

private async salvaUsuario(userData: UserDataDto): Promise<User> {
  console.log(userData)
  const existingUser = await this.findOneByFilters(userData);

  console.log(existingUser)

  if (existingUser) {
    return existingUser;
  }

  const user = new this.userModel(userData);
  user.rate_limit = 0; // Padrão de rate limit inicial
  console.log('ProcessDataService: salvando dados do usuario');
  console.log(user)
  return await user.save();
}

  private async geraQrCodePix(
    user_id: string,
    userData: UserDataDto,
  ): Promise<Payment> {
    this.logger.log('ProcessDataService: criando qrCode');
    const pixQrCodeResponse =
      await this.pagarmeService.createPixQrCode(userData);

    const payment = new this.paymentModel({
      user_id: user_id,
      amount: pixQrCodeResponse.amount,
      expiresAt: pixQrCodeResponse.expiresAt,
      qrCode: pixQrCodeResponse.qrCode,
      qrCodeUrl: pixQrCodeResponse.qrCodeUrl,
      status: pixQrCodeResponse.status,
      id_compra: pixQrCodeResponse.id,
    });

    return await payment.save();
  }

  private async salvaDadosMensagem(id_user: string, formData: FormDataDto, status: string): Promise<Message> {
    console.log(formData.mensagem)
    const messageData = {
      id_user,
      nomeDestinario: formData.nomeDestinario,
      numeroDestinario: formData.numeroDestinario,
      mensagem: formData.mensagem,
      status_message: status,
    };

    const message = new this.messageModel(messageData);
    return await message.save();
  }

    const message = new this.messageModel(messageData);
    return await message.save();
  }

  private retornaQrCode(
    payment: Payment,
    mensagem: Message,
  ): QrCodeResponseDto {
    return {
      id_mensagem: mensagem.id_mensagem,
      brCode: payment.qrCode,
      brCodeBase64: payment.qrCodeUrl,
    };
  }
}
