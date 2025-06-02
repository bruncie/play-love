import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { User, Payment, Message } from '../schema/schemas';
import { PayloadDto, QrCodeResponseDto, UserDataDto, FormDataDto } from '../dto/dto';

@Injectable()
export class ProcessWebHookService {
    private readonly abacatePayApiUrl: string;
    private readonly abacatePayToken: string;

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
    ) { }

    /**
     * Método principal que processa toda a solicitação
     */
    async processWebHook(payload: any): Promise<void> {

        const idCompra = payload.data.pixQrCode.id;
        const payment = await this.findByCompraId(idCompra);
        if (!payment) {
            throw new HttpException('Pedido nao encontrado', HttpStatus.BAD_REQUEST);
        }

        this.validaAtualizaStatus(payload, payment.id_compra);

        this.findOldestOrderByUserIdAndStatus(payment.user_id, 'PENDING')
            .then(async (customerMessage) => {
                if (customerMessage) {

                    // envia mensagem para o WhatsApp
                    // await this.whatsappService.sendMessage(customerMessage.numeroDestinario, customerMessage.mensagem);

                    // Atualiza a mensagem mais antiga para 'SENT'
                    customerMessage.status_message = 'SENT';
                    await this.messageModel.findByIdAndUpdate(customerMessage._id, customerMessage, { new: true }).exec();
                } else {
                    throw new HttpException('Nenhuma mensagem pendente encontrada', HttpStatus.NOT_FOUND);
                }
            })
    }

    async findByCompraId(idCompra: string): Promise<Payment> {
        const payment = await this.paymentModel.findOne({ idCompra }).exec();
        if (!payment) {
            throw new HttpException('Pedido nao encontrado', HttpStatus.BAD_REQUEST);
        }

        return payment;
    }

    async findOldestOrderByUserIdAndStatus(userId: string, status: string): Promise<Message | null> {
        return this.messageModel
            .findOne({ userId, status })       // filtro pelos dois campos
            .sort({ createdAt: 1 })            // 1 = mais antigo primeiro
            .exec();                           // retorna o primeiro da ordenação
    }

    async updatePaymentStatus(id_compra: string, status: string): Promise<Payment | null> {
        const payment = await this.findByCompraId(id_compra);
        payment.status = status;
        return this.paymentModel.findByIdAndUpdate(payment._id, payment, { new: true }).exec();
    }

    async validaAtualizaStatus(payload: any, idCompra: string): Promise<void> {
        let status = payload.data.pixQrCode.status;

        if (status == 'PENDING') {
            throw new HttpException('O pedido ainda está sendo processado', HttpStatus.BAD_REQUEST);
        }

        if (status == 'EXPIRED' || status == 'CANCELLED') {
            await this.updatePaymentStatus(idCompra, status)
            throw new HttpException('Pedido cancelado ou expirado', HttpStatus.BAD_REQUEST);
        }

        if (status == 'REFUNDED ') {
            await this.updatePaymentStatus(idCompra, status)
            throw new HttpException('O pedido foi reembolsado', HttpStatus.BAD_REQUEST);
        }
    }
}