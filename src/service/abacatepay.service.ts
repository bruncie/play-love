import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AbacatePayQrCodeResponseDto, AbacatePayStatusResponseDto, UserDataDto } from 'src/dto/dto';

@Injectable()
export class AbacatePayService {
    private readonly apiUrl: string;
    private readonly apiKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiUrl = this.configService.get<string>('ABACATEPAY_API_URL')!;
        this.apiKey = this.configService.get<string>('ABACATEPAY_API_KEY')!;
    }

    /**
     * Gera um QrCode PIX
     * @param userData Dados do usuário
     * @returns QrCode gerado
     */
    async createPixQrCode(userData: UserDataDto): Promise<AbacatePayQrCodeResponseDto> {
        const amount = 100; // Valor fixo ou dinâmico conforme necessário
        const expiresIn = 3600; // 1 hora de expiração
        const description = "Mensagens para destinatário";

        try {
            const { data, status } = await lastValueFrom(
                this.httpService.post(`${this.apiUrl}/pix/qrcode/create`, {
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
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            if (status !== 200) {
                throw new HttpException('Desculpe, não conseguimos gerar o QrCode no momento', HttpStatus.BAD_REQUEST);
            }

            const qrCodeResponse: AbacatePayQrCodeResponseDto = {
                id: data.data.id,
                amount: data.data.amount,
                status: data.data.status,
                expiresAt: data.data.expiresAt,
                brCode: data.data.brCode,
                brCodeBase64: data.data.brCodeBase64,
            };

            return qrCodeResponse;
        } catch (error) {
            throw new HttpException('Desculpe, não conseguimos gerar o QrCode no momento', HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Verifica o status do pagamento PIX
     * @param id_compra ID da compra gerado pelo AbacatePay
     * @returns Status do pagamento
     */
    async checkPixStatus(id_compra: string): Promise<any> {
        try {
            const response = await lastValueFrom(
                this.httpService.get(`${this.apiUrl}/pix/status/${id_compra}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }),
            );

            const pixStatus: AbacatePayStatusResponseDto = {
                status: response.data.status,
                expiresAt: response.data.expiresAt
            };
            
            return pixStatus;
        } catch (error) {
            console.error('Erro ao verificar status do PIX:', error.response?.data || error.message);
            throw new HttpException(
                error.response?.data?.message || 'Erro ao verificar status do PIX',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}