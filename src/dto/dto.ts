import { IsString, IsEmail, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UserDataDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  celular: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  taxId: string;
}

export class FormDataDto {
  @IsString()
  @IsNotEmpty()
  nomeDestinario: string;

  @IsString()
  @IsNotEmpty()
  numeroDestinario: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  mensagem: string;
}

export class PayloadDto {
  @ValidateNested()
  @Type(() => UserDataDto)
  userData: UserDataDto;

  @ValidateNested()
  @Type(() => FormDataDto)
  formData: FormDataDto;
}

export class QrCodeResponseDto {
  id_compra: string;
  id_mensagem: string;
  brCode: string;
  brCodeBase64: string;
}

export class AbacatePayStatusResponseDto {
  status: string;
  expiresAt: string;
}

export class AbacatePayQrCodeResponseDto {
  id: string;
  amount: string;
  status: string;
  expiresAt: string;
  brCode: string;
  brCodeBase64: string;
}