import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { PixResponseDto, UserDataDto, HomePhoneDto } from 'src/dto/dto';

@Injectable()
export class PagarmeService {
    private readonly apiUrl: string;
    private readonly apiKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiUrl = this.configService.get<string>('PAGARME_URL')!;
        this.apiKey = this.configService.get<string>('PAGARME_API_KEY_TEST')!;
    }

    /**
     * Gera um QrCode PIX
     * @param userData Dados do usuário
     * @returns QrCode gerado
     */
    async createPixQrCode(userData: UserDataDto): Promise<PixResponseDto> {
        console.log('PagarmeService: criando QrCode PIX');
        const amount = 100; // Valor fixo ou dinâmico conforme necessário
        const expiresIn = 3600; // 1 hora de expiração
        const description = "Mensagens para destinatário";
        const numberUser = this.getHomePhone(userData);

        try {
            const { data, status } = await lastValueFrom(
                this.httpService.post(`${this.apiUrl}`, {
                    items: [
                        {
                            amount: amount,
                            description: description,
                            quantity: 1,
                        }
                    ],
                    customer: {
                        name: userData.nome,
                        email: userData.email,
                        type: 'individual',
                        document: '70595980490',//userData.taxId.replace(/\D/g, ''), // Remove caracteres não numéricos
                        phones: {
                            home_phone: {
                                country_code: numberUser.countryCode,
                                number: numberUser.phone,
                                area_code: numberUser.area,
                            },
                        },
                    },
                    payments: [
                        {
                            payment_method: 'pix',
                            pix: {
                                expires_in: expiresIn,
                                additional_information: [
                                    {
                                        name: 'Quantidade',
                                        value: '1',
                                    },
                                ],
                            },
                        },
                    ],
                }, {
                    headers: {
                        'Authorization': this.encodeAuthorization(this.apiKey),
                        'Content-Type': 'application/json',
                    },
                }),
            );

            if (status !== 200) {
                throw new HttpException('Desculpe, não conseguimos gerar o QrCode no momento', HttpStatus.BAD_REQUEST);
            }

            console.log('Dados do QrCode:', data);
            const qrCodeResponse: PixResponseDto = {
                id: data.id,
                amount: data.amount,
                status: data.status,
                expiresAt: data.charges[0].last_transaction.expires_at,
                qrCode: data.charges[0].last_transaction.qr_code,
                qrCodeUrl: data.charges[0].last_transaction.qr_code_url,
            };
            console.log('##########################################');
            console.log('QrCode gerado com sucesso:', qrCodeResponse);

            return qrCodeResponse;
        } catch (error) {
            throw new HttpException('Desculpe, não conseguimos gerar o QrCode no momento', HttpStatus.BAD_REQUEST);
        }
    }

    private encodeAuthorization(apiKey: string): string {
        return 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
    }

    private getHomePhone(userData: UserDataDto): HomePhoneDto {
        // Remove caracteres não numéricos
        const cleanNumber = userData.celular.replace(/\D/g, '');

        // Valida se tem pelo menos 10 dígitos (DDD + telefone)
        if (cleanNumber.length < 10) {
            throw new Error('Número de telefone inválido');
        }

        let countryCode: string;
        let area: string;
        let phone: string;

        // Se começar com 55 e tiver 12+ dígitos, considera que tem código do país
        if (cleanNumber.length >= 12 && cleanNumber.startsWith('55')) {
            countryCode = cleanNumber.substring(0, 2);
            area = cleanNumber.substring(2, 4);
            phone = cleanNumber.substring(4);
        } else {
            // Código do país automático como 55 (Brasil)
            countryCode = '55';
            area = cleanNumber.substring(0, 2);
            phone = cleanNumber.substring(2);
        }

        // Valida se o telefone tem pelo menos 8 dígitos
        if (phone.length < 8) {
            throw new Error('Número de telefone muito curto');
        }

        return {
            countryCode,
            area,
            phone,
        };
    }
}