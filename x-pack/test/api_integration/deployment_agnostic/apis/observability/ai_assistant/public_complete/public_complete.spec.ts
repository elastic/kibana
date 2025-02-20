/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  FunctionDefinition,
  MessageRole,
  type Message,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  MessageAddEvent,
  type StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import type OpenAI from 'openai';
import { type AdHocInstruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import {
  createLlmProxy,
  LlmProxy,
  ToolCall,
} from '../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const messages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: 'Good morning, bot!',
      },
    },
  ];

  describe('/api/observability_ai_assistant/chat/complete', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
    let proxy: LlmProxy;
    let connectorId: string;

    interface RequestOptions {
      actions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
      instructions?: AdHocInstruction[];
      format?: 'openai' | 'default';
      conversationResponse: string | ToolCall;
    }

    async function getResponseBody({
      actions,
      instructions,
      format = 'default',
      conversationResponse,
    }: RequestOptions) {
      void proxy.interceptConversationTitle('My Title').completeAfterIntercept();
      void proxy.interceptConversation(conversationResponse).completeAfterIntercept();

      const response = await observabilityAIAssistantAPIClient.admin({
        endpoint: 'POST /api/observability_ai_assistant/chat/complete 2023-10-31',
        params: {
          query: { format },
          body: {
            messages,
            connectorId,
            persist: true,
            actions,
            instructions,
          },
        },
      });

      await proxy.waitForAllInterceptorsSettled();

      return String(response.body);
    }

    async function getEvents(options: RequestOptions) {
      const responseBody = await getResponseBody(options);
      return responseBody
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StreamingChatResponseEvent)
        .slice(2); // ignore context request/response, we're testing this elsewhere
    }

    before(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });
    });

    after(async () => {
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
      proxy.close();
    });

    describe('after executing an action and closing the stream', () => {
      let events: StreamingChatResponseEvent[];

      const fnName = 'my_action';
      const fnArgs = JSON.stringify({ foo: 'bar' });

      before(async () => {
        events = await getEvents({
          actions: [
            {
              name: fnName,
              description: 'My action',
              parameters: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                  },
                },
              },
            },
          ],
          conversationResponse: {
            tool_calls: [
              {
                id: 'fake-id',
                index: 'fake-index',
                function: {
                  name: fnName,
                  arguments: fnArgs,
                },
              },
            ],
          },
        });
      });

      it('does not persist the conversation (the last event is not a conversationUpdated event)', () => {
        const lastEvent = events[events.length - 1] as MessageAddEvent;
        expect(lastEvent.type).to.not.be('conversationUpdate');
        expect(lastEvent.type).to.be('messageAdd');
        expect(lastEvent.message.message.function_call).to.eql({
          name: fnName,
          arguments: fnArgs,
          trigger: MessageRole.Assistant,
        });
      });
    });

    describe('after adding an instruction', () => {
      let body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

      before(async () => {
        await getEvents({
          instructions: [
            {
              text: 'This is a random instruction',
              instruction_type: 'user_instruction',
            },
          ],
          actions: [
            {
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
            },
          ],
          conversationResponse: {
            tool_calls: [
              {
                id: 'fake-id',
                index: 'fake-index',
                function: {
                  name: 'my_action',
                  arguments: JSON.stringify({ foo: 'bar' }),
                },
              },
            ],
          },
        });
      });

      it.skip('includes the instruction in the system message', async () => {
        expect(body.messages[0].content).to.contain('This is a random instruction');
      });
    });

    describe('with openai format', () => {
      let responseBody: string;

      before(async () => {
        responseBody = await getResponseBody({ format: 'openai', conversationResponse: 'Hello' });
      });

      function extractDataParts(lines: string[]) {
        return lines.map((line) => {
          // .replace is easier, but we want to verify here whether
          // it matches the SSE syntax (`data: ...`)
          const [, dataPart] = line.match(/^data: (.*)$/) || ['', ''];
          return dataPart.trim();
        });
      }

      function getLines() {
        return responseBody.split('\n\n').filter(Boolean);
      }

      it('outputs each line an SSE-compatible format (data: ...)', () => {
        const lines = getLines();

        lines.forEach((line) => {
          expect(line.match(/^data: /));
        });
      });

      it('ouputs one chunk, and one [DONE] event', () => {
        const dataParts = extractDataParts(getLines());

        expect(dataParts[0]).not.to.be.empty();
        expect(dataParts[1]).to.be('[DONE]');
      });

      it('outuputs an OpenAI-compatible chunk', () => {
        const [dataLine] = extractDataParts(getLines());

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
  });
}
