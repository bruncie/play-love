import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { User, Payment, Message } from '../schema/schemas';
import { PayloadDto, QrCodeResponseDto, UserDataDto, FormDataDto } from '../dto/dto';
import { AbacatePayService } from './abacatepay.service';

@Injectable()
export class ProcessDataService {

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly abacatePayService: AbacatePayService,
  ) { }

  /**
   * Processa o payload recebido
   * @param payload Dados do usuário e mensagem
   * @returns QrCode gerado
   */
  async processPayload(payload: PayloadDto): Promise<QrCodeResponseDto> {
    const user = await this.salvaUsuario(payload.userData);
    const payment = await this.geraQrCodePix(user.user_id, payload.userData);
    const mensagem = await this.salvaDadosMensagem(user.user_id, payload.formData);
    return this.retornaQrCode(payment, mensagem);
  }

  /**
   * Verifica o status do pagamento
   * @param id ID do pagamento
   * @returns Status do pagamento
   */
  async getStatus(id_compra: string, id_mensagem: string): Promise<string> {
    const pixStatus = await this.abacatePayService.checkPixStatus(id_compra);

    if (pixStatus != 'PAID') {
      throw new Error('Pagamento ainda não foi confirmado');
    }
    const mensagem = await this.messageModel.findOne({ id_mensagem });

    //postar mensagem no whatsapp
    // await this.whatsappService.sendMessage(mensagem.numeroDestinario, mensagem.mensagem);

    return pixStatus.status;
  }

  private async salvaUsuario(userData: UserDataDto): Promise<User> {
    const user = new this.userModel(userData);
    return await user.save();
  }

  private async geraQrCodePix(user_id: string, userData: UserDataDto): Promise<Payment> {

    const pixQrCodeResponse = await this.abacatePayService.createPixQrCode(userData);

    const payment = new this.paymentModel({
      user_id: user_id,
      amount: pixQrCodeResponse.amount,
      expiresAt: pixQrCodeResponse.expiresAt,
      brCode: pixQrCodeResponse.brCode,
      brCodeBase64: pixQrCodeResponse.brCodeBase64,
      status: pixQrCodeResponse.status,
      id_compra: pixQrCodeResponse.id,
      abacatePayResponse: pixQrCodeResponse,
    });

    return await payment.save();
  }

  private async salvaDadosMensagem(id_user: string, formData: FormDataDto): Promise<Message> {
    const messageData = {
      id_user,
      nomeDestinario: formData.nomeDestinario,
      numeroDestinario: formData.numeroDestinario,
      mensagem: formData.mensagem,
    };

    const message = new this.messageModel(messageData);
    return await message.save();
  }
  
  private retornaQrCode(payment: Payment, mensagem: Message): QrCodeResponseDto {
    return {
      id_compra: payment.id_compra,
      id_mensagem: mensagem.id_mensagem,
      brCode: payment.brCode,
      brCodeBase64: payment.brCodeBase64,
    };
  }
}