import { BaseChain } from './baseChain';
import { ConversationService } from '../../conversation/conversation.service';

export class WelcomeChain extends BaseChain {
  private conversationService: ConversationService;

  constructor(conversationService: ConversationService) {
    super();
    this.conversationService = conversationService;
  }

  async call(values: { input: string; userId: string }): Promise<any> {
    this.logger.log(`WelcomeChain called with input: `, values);
    let name = 'amigo(a)';

    const doc = await this.conversationService.getSecretMessageDocForUser(
      values.userId,
    );

    this.logger.log('Retrieved document: ', doc);

    if (doc && doc.recipientName) {
      name = doc.recipientName;
    }

    return {
      response: `Ooi ${name} 💌\nParece que você tem um admirador secreto...\nDeseja ler a mensagem que ele(a) enviou?`,
      intent: 'WELCOME',
    };
  }
}
