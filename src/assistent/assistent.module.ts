import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { ConversationService } from './conversation/conversation.service';
import { AiService } from './ai/ai.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserConversationModel,
  UserConversationSchema,
} from './conversation/conversation.schema';
import { ConfigModule } from '@nestjs/config';
import { WhatsappSessionStoreService } from './whatsapp/whatsappSessionStore';
import { QrControllerController } from './whatsapp/qr-controller.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserConversationModel.name, schema: UserConversationSchema },
    ]),
    ConfigModule,
  ],
  providers: [
    WhatsappService,
    WhatsappSessionStoreService,
    ConversationService,
    AiService,
  ],
  controllers: [QrControllerController],
  exports: [AiService],
})
export class AssistentModule {}
