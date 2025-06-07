import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Payment, Message } from '../schema/schemas';

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
        const statusCompra = payload.data.status;

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
                    console.log('Atualizando mensagem para SENT');
                    await this.messageModel.findOneAndUpdate(
                        { id_mensagem: customerMessage.id_mensagem },
                        customerMessage,
                        { new: true }
                    ).exec();

                    //this.updateRateLimt(payment.user_id)  //utilizar quando estiver pronto o ajuste de 3 mensagens por compra
                } else {
                    throw new HttpException('Nenhuma mensagem pendente encontrada', HttpStatus.NOT_FOUND);
                }
            })
    }

    async updateRateLimt(user_id: string): Promise<void> {
        console.log('Atualizando rate_limit do usuário');
        const user = await this.userModel.findOneAndUpdate(
            { user_id },                           // busca pelo campo correto
            { $inc: { rate_limit: 2 } },
            { new: true }
        ).exec();
    }

    async findByCompraId(idCompra: string): Promise<Payment> {
        console.log('Buscando pagamento pelo id_compra:', idCompra);
        const payment = await this.paymentModel.findOne({ id_compra: idCompra }).exec();
        if (payment == null) {
            throw new HttpException('Pedido nao encontrado', HttpStatus.BAD_REQUEST);
        }

        return payment;
    }

    async findOldestOrderByUserIdAndStatus(idUser: string, statusMessage: string): Promise<Message | null> {
        console.log('Buscando mensagem mais antiga do usuário');
        const customerMessage = this.messageModel
            .findOne({ id_user: idUser, status_message: statusMessage })       // filtro pelos dois campos
            .sort({ createdAt: 1 })            // 1 = mais antigo primeiro
            .exec();                           // retorna o primeiro da ordenação
        console.log('Mensagem encontrada:', customerMessage);
        return customerMessage;
    }

    async updatePaymentStatus(id_compra: string, status: string): Promise<Payment | null> {
        console.log('atualizando status do pagamento')
        const payment = await this.findByCompraId(id_compra);
        payment.status = status;
        return this.paymentModel.findOneAndUpdate(
            { id_compra },                       // <-- aqui você busca pelo campo correto
            { status },                          // <-- atualiza o campo `status`
            { new: true }                        // <-- retorna o documento atualizado
        ).exec();
    }

    async validaAtualizaStatus(status: string, idCompra: string): Promise<void> {
        console.log('validando status do pagamento')
        if (status == 'paid') {
            await this.updatePaymentStatus(idCompra, status)
        }
    }

    // async plusRateLimit(amoun: number, idCompra: string): Promise<void> {
    //     await 
    // }
}