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
    const mensagem = await this.salvaDadosMensagem(
      user.user_id,
      payload.formData,
    );
    return this.retornaQrCode(payment, mensagem);
  }

  /**
   * Verifica o status do pagamento
   * @param id ID do pagamento
   * @returns Status do pagamento
   */
  async getStatus(id_compra: string, id_mensagem: string): Promise<string> {
    // const pixStatus = await this.abacatePayService.checkPixStatus(id_compra);

    // if (pixStatus != 'PAID') {
    //   throw new Error('Pagamento ainda não foi confirmado');
    // }
    // const mensagem = await this.messageModel.findOne({ id_mensagem });

    // //postar mensagem no whatsapp
    // // await this.whatsappService.sendMessage(mensagem.numeroDestinario, mensagem.mensagem);

    return 'pixStatus.status';
  }

  private async salvaUsuario(userData: UserDataDto): Promise<User> {
    const user = new this.userModel(userData);
    this.logger.log('ProcessDataService: salvando dados do usuario');
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

  private async salvaDadosMensagem(
    id_user: string,
    formData: FormDataDto,
  ): Promise<Message> {
    this.logger.log(formData.mensagem);
    const messageData = {
      id_user,
      nomeDestinario: formData.nomeDestinario,
      numeroDestinario: formData.numeroDestinario,
      mensagem: formData.mensagem,
      status_message: 'PENDING', // Inicializa como PENDING
    };

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
