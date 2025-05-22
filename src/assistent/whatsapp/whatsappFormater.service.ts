import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappFormatter {
  public cleanPhoneNumber(input: string): string {
    const onlyNumbers = input.replace(/\D/g, '');
    return onlyNumbers.substring(2);
  }

  public formatPhoneNumber(number: string): string {
    const cleanNumber = number.replace('+', '');

    const prefix = cleanNumber.substring(0, 4);
    let rest = cleanNumber.substring(4);

    if (rest.startsWith('9')) {
      rest = rest.substring(1);
    }

    return '55' + prefix + rest + '@c.us';
  }

  public parsePhoneNumber(waNumber: string): string {
    let number = waNumber.replace('@c.us', '');
    number = '+' + number;

    return number.slice(0, 5) + '9' + number.slice(5);
  }
}
