/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type {
  FunctionDefinition,
  ConversationCreateRequest,
} from '@kbn/observability-ai-assistant-plugin/common';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { type Instruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import { last } from 'lodash';
import type { LlmProxy } from '../utils/create_llm_proxy';
import { createLlmProxy } from '../utils/create_llm_proxy';
import { clearConversations } from '../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  describe('/api/observability_ai_assistant/chat/complete', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;

    const defaultUserPrompt = 'Good morning, bot!';

    async function callPublicChatComplete({
      actions,
      instructions,
      persist = true,
      isStream,
      conversationId,
      messages,
    }: {
      actions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
      instructions?: Array<string | Instruction>;
      persist?: boolean;
      isStream?: boolean;
      conversationId?: string;
      messages?: Message[];
    }): Promise<string | ConversationCreateRequest> {
      const defaultMessages: Message[] = [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: defaultUserPrompt,
          },
        },
      ];

      const { body } = await observabilityAIAssistantAPIClient.admin({
        endpoint: 'POST /api/observability_ai_assistant/chat/complete 2023-10-31',
        params: {
          body: {
            messages: messages ?? defaultMessages,
            connectorId,
            persist,
            actions,
            instructions,
            isStream,
            conversationId,
          },
        },
      });

      const shouldStream = isStream ?? true;

      return shouldStream ? String(body) : (body as ConversationCreateRequest);
    }

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });
    });

    after(async () => {
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
      llmProxy.close();
    });

    const action = {
      name: 'my_action',
      description: 'My action',
      parameters: {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
        },
      },
    } as const;

    afterEach(async () => {
      llmProxy.clear();
    });

    describe('after adding an instruction', () => {
      before(async () => {
        void llmProxy.interceptWithFunctionRequest({
          name: 'my_action',
          arguments: () => JSON.stringify({ foo: 'bar' }),
          when: (body) => {
            const content = body.messages?.[0]?.content as string;
            return Boolean(content.includes('This is a random instruction'));
          },
        });

        await callPublicChatComplete({
          instructions: ['This is a random instruction'],
          actions: [action],
          persist: false,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      it('includes the instruction in the system message', async () => {
        const { requestBody } = llmProxy.interceptedRequests[0];
        expect(requestBody.messages[0].content).to.contain('This is a random instruction');
      });
    });

    describe('with openai format', () => {
      let responseBody: string;

      before(async () => {
        void llmProxy.interceptTitle('My Title');
        void llmProxy.interceptWithResponse('Hello');

        responseBody = (await callPublicChatComplete({})) as string;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      function extractDataParts(lines: string[]) {
        return lines.map((line) => {
          // .replace is easier, but we want to verify here whether
          // it matches the SSE syntax (`data: ...`)
          const [, dataPart] = line.match(/^data: (.*)$/) || ['', ''];
          return dataPart.trim();
        });
      }

      function getLines(str: string) {
        return str.split('\n\n').filter(Boolean);
      }

      it('outputs each line in an SSE-compatible format (data: ...)', () => {
        const lines = getLines(responseBody);

        lines.forEach((line) => {
          expect(line.match(/^data: /));
        });
      });

      it('ouputs one chunk, and one [DONE] event', () => {
        const dataParts = extractDataParts(getLines(responseBody));

        expect(dataParts[0]).not.to.be.empty();
        expect(dataParts[1]).to.be('[DONE]');
      });

      it('outuputs an OpenAI-compatible chunk', () => {
        const [dataLine] = extractDataParts(getLines(responseBody));

        expect(() => {
          JSON.parse(dataLine);
        }).not.to.throwException();

        const parsedChunk = JSON.parse(dataLine);

        expect(parsedChunk).to.eql({
          model: 'unknown',
          choices: [
            {
              delta: {
                content: 'Hello',
              },
              finish_reason: null,
              index: 0,
            },
          ],
          object: 'chat.completion.chunk',
          // just test that these are a string and a number
          id: String(parsedChunk.id),
          created: Number(parsedChunk.created),
        });
      });
    });

    describe('when isStream:false and persist:false', () => {
      let conversationResponseBody: ConversationCreateRequest;

      before(async () => {
        void llmProxy.interceptWithResponse('Hello sync');

        conversationResponseBody = (await callPublicChatComplete({
          isStream: false,
          persist: false,
        })) as ConversationCreateRequest;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      it('returns a single conversation payload', () => {
        expect(conversationResponseBody.conversation.id).to.be.a('string');
        expect(conversationResponseBody.messages).to.be.an('array');
      });
    });

    describe('when isStream:false for existing conversation', () => {
      const followUpQuestion = 'Can you give me more details?';
      const followUpAnswer = 'Yes John. Here are some more details: yadadada.';
      let createdConversationResponse: ConversationCreateRequest;
      let updatedConversationResponse: ConversationCreateRequest;

      before(async () => {
        await clearConversations(es);

        void llmProxy.interceptTitle('Conversation that will be updated');
        void llmProxy.interceptWithResponse('Good morning, John!');

        createdConversationResponse = (await callPublicChatComplete({
          persist: true,
          isStream: false,
        })) as ConversationCreateRequest;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        void llmProxy.interceptWithResponse(followUpAnswer);

        updatedConversationResponse = (await callPublicChatComplete({
          messages: [
            ...createdConversationResponse.messages,
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: followUpQuestion,
              },
            },
          ],
          persist: true,
          isStream: false,
          conversationId: createdConversationResponse.conversation.id,
        })) as ConversationCreateRequest;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      after(async () => {
        await clearConversations(es);
      });

      it('retains the original conversation id', () => {
        expect(updatedConversationResponse.conversation.id).to.be(
          createdConversationResponse.conversation.id
        );
      });

      it('includes the initial user message', () => {
        const userMessages = updatedConversationResponse.messages.filter(
          (message) => message.message.role === MessageRole.User
        );

        expect(userMessages.some((message) => message.message.content === defaultUserPrompt)).to.be(
          true
        );
      });

      it('includes the follow-up user message', () => {
        const userMessages = updatedConversationResponse.messages.filter(
          (message) => message.message.role === MessageRole.User
        );

        expect(userMessages.some((message) => message.message.content === followUpQuestion)).to.be(
          true
        );
      });

      it('includes the follow-up assistant response', () => {
        const lastAssistantMessage = last(updatedConversationResponse.messages)?.message;
        expect(lastAssistantMessage?.role).to.be(MessageRole.Assistant);
        expect(lastAssistantMessage?.content).to.be(followUpAnswer);
      });

      it('the updated conversation has the expected properties', () => {
        expect(updatedConversationResponse).to.have.keys([
          '@timestamp',
          'archived',
          'conversation',
          'labels',
          'messages',
          'namespace',
          'numeric_labels',
          'public',
          'systemMessage',
          'user',
        ]);
      });
    });
  });
}
