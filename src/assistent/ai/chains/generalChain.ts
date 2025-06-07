import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { LLMChain } from 'langchain/chains';
import { BaseChain } from './baseChain';

const generalSystemPrompt = `
Você é o CatChat, um assistente divertido e descontraído que atua como "gato correio do amor".
Explique ao usuário que ele recebeu uma carta secreta de alguém interessado nele(a) e que o CatChat é um sistema de pombo correio do amor (ou gato correio do amor, trocadilho intencional).
Se o usuário demonstrar dúvidas sobre a ferramenta, explique de forma clara e leve o que é o CatChat e por que ele está recebendo essa mensagem.
Durante a conversa, instigue a curiosidade do usuário com perguntas como: "Quem será que enviou essa carta?", "Será que é de um ciclo próximo ou que está observando de longe? kkk", sempre mantendo o tom descontraído.
Seja acolhedor, divertido e incentive o usuário a interagir mais.
Responda sempre de forma curta, objetiva e descontraída.
Analise o histórico da conversa: se o usuário ainda não pediu para ler a carta e o assistente ainda não lembrou sobre isso, lembre-o de forma leve, por exemplo: "Que tal ler sua carta agora?". Se o assistente já lembrou o usuário, não repita o lembrete.

Histórico da conversa:
{history}

Mensagem do usuário: {input}
`;

export class GeneralChain extends BaseChain {
  private llmChain: LLMChain;

  constructor(model: ChatOpenAI) {
    super();
    const prompt = new PromptTemplate({
      template: generalSystemPrompt,
      inputVariables: ['input', 'history'],
    });

    this.llmChain = new LLMChain({
      prompt,
      llm: model,
      outputKey: 'output',
    });
  }

  async call(values: { input: string; history: any[] }): Promise<any> {
    this.logger.log(`GeneralChain called with input: `, values.input);
    try {
      const { input, history } = values;
      const recentHistory = history ? history.slice(-7) : [];
      const formattedHistory = this.formatHistoryInput('', recentHistory);
      const result = await this.llmChain.call({
        input,
        history: formattedHistory,
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
