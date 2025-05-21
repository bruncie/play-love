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
    async process(idCompra: string, status: string): Promise<string> {
        this.validaStatus(status);
        this.updatePaymentStatus(idCompra, status)

        return '';
    }

    async findByCompraId(idCompra: string): Promise<Payment> {
        const payment = await this.paymentModel.findOne({ idCompra }).exec();
        if (!payment) {
            throw new HttpException('Pedido nao encontrado', HttpStatus.BAD_REQUEST);
        }

        return payment;
    }

    async updatePaymentStatus(id_compra: string, status: string): Promise<Payment | null> {
        const payment = await this.findByCompraId(id_compra);
        payment.status = status;
        return this.paymentModel.findByIdAndUpdate(payment._id, payment, { new: true }).exec();
    }

    validaStatus(status: string) {
        if (status == 'PENDING') {
            throw new HttpException('O pedido ainda está sendo processado', HttpStatus.BAD_REQUEST);
        }
 
        if (status == 'EXPIRED' || status == 'CANCELLED') {
            throw new HttpException('Pedido cancelado ou expirado', HttpStatus.BAD_REQUEST);
        }

        if (status == 'REFUNDED ') {
            throw new HttpException('O pedido foi reembolsado', HttpStatus.BAD_REQUEST);
        }
    }
}