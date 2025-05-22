import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { LLMChain } from 'langchain/chains';
import { BaseChain } from './baseChain';

export class GeneralChain extends BaseChain {
  private llmChain: LLMChain;

  constructor(model: ChatOpenAI, systemPrompt: string) {
    super();
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(systemPrompt),
      HumanMessagePromptTemplate.fromTemplate('{input}'),
    ]);

    this.llmChain = new LLMChain({
      prompt: chatPrompt,
      llm: model,
      outputKey: 'output',
    });
  }

  async call(values: {
    input: string;
    history: any[];
    recipientName?: string;
    secretMessage?: string;
  }): Promise<any> {
    try {
      const { input, history, recipientName = '', secretMessage = '' } = values;
      const enhancedInput = this.formatHistoryInput(input, history);
      const result = await this.llmChain.call({
        input: enhancedInput,
        recipientName,
        secretMessage,
      });
      return {
        response: result.output,
        intent: 'GENERAL',
      };
    } catch (error) {
      console.error('Erro no GeneralChain:', error);
      return {
        response:
          'Ocorreu um erro ao fornecer o conteúdo solicitado. Por favor, tente novamente.',
      };
    }
  }
}
