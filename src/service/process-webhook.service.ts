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

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
    ) { }

    /**
     * Método principal que processa toda a solicitação
     */
    async processWebHook(payload: any): Promise<void> {

        const idCompra = payload.data.id;
        console.log('#############################################################');
        console.log('idCompra: ', idCompra);
        const statusCompra = payload.data.status;
        console.log('statusCompra: ', statusCompra);
        const payment = await this.findByCompraId(idCompra);

        this.validaAtualizaStatus(statusCompra, payment.id_compra);

        //busca a mensagem mais antiga pendente do usuário
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

    async findByCompraId(id_compra: string): Promise<Payment> {
        const payment = await this.paymentModel.findOne({ id_compra }).exec();
        if (payment == null) {
            throw new HttpException('Pedido nao encontrado', HttpStatus.BAD_REQUEST);
        }

        return payment;
    }

    async findOldestOrderByUserIdAndStatus(id_user: string, status_message: string): Promise<Message | null> {
        return this.messageModel
            .findOne({ id_user, status_message })       // filtro pelos dois campos
            .sort({ createdAt: 1 })            // 1 = mais antigo primeiro
            .exec();                           // retorna o primeiro da ordenação
    }

    async updatePaymentStatus(id_compra: string, status: string): Promise<Payment | null> {
        const payment = await this.findByCompraId(id_compra);
        payment.status = status;
        return this.paymentModel.findByIdAndUpdate(payment._id, payment, { new: true }).exec();
    }

    async validaAtualizaStatus(status: string, idCompra: string): Promise<void> {
        if (status == 'paid') {
            await this.updatePaymentStatus(idCompra, status)
        }
    }

    // async plusRateLimit(amoun: number, idCompra: string): Promise<void> {
    //     await 
    // }
}