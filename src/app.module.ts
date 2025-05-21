import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
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
  MessageSchema
} from './schema/schemas';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/message-app'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Message.name, schema: MessageSchema }
    ]),
    HttpModule,
  ],
  controllers: [ProcessDataController],
  providers: [ProcessDataService, AbacatePayService],
})
export class AppModule {}