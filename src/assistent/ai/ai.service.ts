import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { GeneralChain } from './chains/generalChain';
import { generalPrompt } from './prompt/prompt-cupido';
import { ConversationService } from '../conversation/conversation.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AiService {
  private model: ChatOpenAI;
  private GeneralChain: GeneralChain;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private conversationService: ConversationService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsApp: WhatsappService,
  ) {
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini-2024-07-18',
      temperature: 0.7,
    });

    this.GeneralChain = new GeneralChain(this.model, generalPrompt);
  }

  async processMessage(
    userId: string,
    message: string,
    name?: string,
    secretMessage?: string,
  ) {
    let responseText;
    let response;

    try {
      await this.conversationService.addMsgUserHistory(userId, message);

      const conversationHistory =
        this.conversationService.getUserHistory(userId);

      const inputMessage = this.buildInputMessage(message, name, secretMessage);

      response = await this.GeneralChain.call({
        input: inputMessage,
        history: conversationHistory,
        recipientName: name,
        secretMessage: secretMessage,
      });

      responseText = this.handleResponseText(response);
      await this.conversationService.addAssistantResponse(userId, responseText);
      this.whatsApp.sendMessage(userId, responseText);

      return { text: responseText };
    } catch (error) {
      return this.handleProcessMessageError(error, userId);
    }
  }

  private buildInputMessage(
    message: string,
    name?: string,
    secretMessage?: string,
  ): string {
    if (secretMessage && name) {
      return `Uma nova mensagem foi enviada por um admirador secreto para ${name}. O conteúdo da mensagem é: "${secretMessage}". Por favor, envie uma mensagem romântica e misteriosa perguntando se ${name} deseja ler.`;
    }

    return message;
  }

  async clearUserHistory(userId: string): Promise<void> {
    await this.conversationService.clearUserHistory(userId);
  }

  private handleResponseText(response: any) {
    let responseText;
    if (response.response) {
      responseText = response.response;
    } else if (response.output) {
      responseText = response.output;
    } else {
      responseText =
        'Não foi possível gerar uma resposta. Por favor, tente novamente.';
    }
    return responseText;
  }

  private async handleProcessMessageError(error: any, userId: string) {
    this.logger.error('Erro ao processar mensagem:', error);

    const errorMessage =
      'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
    await this.conversationService.addAssistantResponse(userId, errorMessage);

    return {
      text: errorMessage,
      intent: 'ERROR',
    };
  }
}
