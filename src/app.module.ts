import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProcessDataController } from './controller/process-data.controller';
import { ProcessDataService } from './service/process-data.service';
import { AbacatePayService } from './service/abacatepay.service';
import { HttpModule } from '@nestjs/axios';
import {
  User,
  UserSchema,
  Payment,
  PaymentSchema,
  Message,
  MessageSchema,
} from './schema/schemas';
import { SendMessageController } from './controller/send-message.controller';
import { SendMessageService } from './service/send-message.service';
import { SendMessage, SendMessageSchema } from './schema/send-message.schema';
import { AssistentModule } from './assistent/assistent.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Message.name, schema: MessageSchema },
      { name: SendMessage.name, schema: SendMessageSchema },
    ]),
    HttpModule,
    AssistentModule,
  ],
  controllers: [ProcessDataController, SendMessageController],
  providers: [ProcessDataService, AbacatePayService, SendMessageService],
})
export class AppModule {}
