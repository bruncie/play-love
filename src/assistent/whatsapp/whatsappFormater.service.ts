import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappFormatter {
  public cleanPhoneNumber(input: string): string {
    const onlyNumbers = input.replace(/\D/g, '');
    return onlyNumbers.substring(2);
  }

  public formatPhoneNumber(number: string): string {
    console.log('formatPhoneNumber', number);

    // Remove qualquer caractere não numérico
    let cleanNumber = number.replace(/\D/g, '');
    // Remove o 9 do índice 2, se existir
    if (cleanNumber[2] === '9') {
      cleanNumber = cleanNumber.slice(0, 2) + cleanNumber.slice(3);
    }
    // Garante que o número tenha o DDI (55) no início
    let formatted = cleanNumber;
    if (!formatted.startsWith('55')) {
      formatted = '55' + formatted;
    }
    return formatted + '@c.us';
  }

  public parsePhoneNumber(waNumber: string): string {
    let number = waNumber.replace('@c.us', '');
    number = '+' + number;

    return number.slice(0, 5) + '9' + number.slice(5);
  }
}
