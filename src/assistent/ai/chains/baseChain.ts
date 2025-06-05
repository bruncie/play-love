import { Logger } from '@nestjs/common';

// chains/base.chain.ts
export abstract class BaseChain {
  readonly logger = new Logger(BaseChain.name);
  abstract call(values: { input: string; history?: any[] }): Promise<any>;

  protected formatHistoryInput(input: string, history: any[]): string {
    if (!history || history.length === 0) {
      return input;
    }

    // Formatar histórico em um formato que o modelo possa entender
    const formattedHistory = history
      .map(
        (item) =>
          `${item.role === 'user' ? 'Usuário' : 'Assistente'}: ${item.content}`,
      )
      .join('\n');

    return `
Histórico da conversa:
${formattedHistory}

Pergunta atual: ${input}`;
  }
}
