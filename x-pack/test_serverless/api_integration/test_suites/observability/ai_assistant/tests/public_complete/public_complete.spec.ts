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
import { type StreamingChatResponseEvent } from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import { pick } from 'lodash';
import type OpenAI from 'openai';
import { type AdHocInstruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import {
  createLlmProxy,
  isFunctionTitleRequest,
  LlmProxy,
  LlmResponseSimulator,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/common/create_llm_proxy';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  const messages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.System,
        content: 'You are a helpful assistant',
      },
    },
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: 'Good morning, bot!',
      },
    },
  ];
  // TODO: causes tests to fail checking for stored conversations
  describe.skip('/api/observability_ai_assistant/chat/complete', () => {
    let proxy: LlmProxy;
    let connectorId: string;
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    interface RequestOptions {
      actions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
      instructions?: AdHocInstruction[];
      format?: 'openai' | 'default';
    }

    type ConversationSimulatorCallback = (
      conversationSimulator: LlmResponseSimulator
    ) => Promise<void>;

    async function getResponseBody(
      { actions, instructions, format = 'default' }: RequestOptions,
      conversationSimulatorCallback: ConversationSimulatorCallback
    ) {
      const titleInterceptor = proxy.intercept('title', (body) => isFunctionTitleRequest(body));

      const conversationInterceptor = proxy.intercept(
        'conversation',
        (body) => !isFunctionTitleRequest(body)
      );

      const responsePromise = observabilityAIAssistantAPIClient.slsUser({
        endpoint: 'POST /api/observability_ai_assistant/chat/complete 2023-10-31',
        roleAuthc,
        internalReqHeader,
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

      const [conversationSimulator, titleSimulator] = await Promise.race([
        Promise.all([
          conversationInterceptor.waitForIntercept(),
          titleInterceptor.waitForIntercept(),
        ]),
        // make sure any request failures (like 400s) are properly propagated
        responsePromise.then(() => []),
      ]);

      await titleSimulator.status(200);
      await titleSimulator.next('My generated title');
      await titleSimulator.complete();

      await conversationSimulator.status(200);
      if (conversationSimulatorCallback) {
        await conversationSimulatorCallback(conversationSimulator);
      }

      const response = await responsePromise;

      return String(response.body);
    }

    async function getEvents(
      options: RequestOptions,
      conversationSimulatorCallback: ConversationSimulatorCallback
    ) {
      const responseBody = await getResponseBody(options, conversationSimulatorCallback);

      return responseBody
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StreamingChatResponseEvent)
        .slice(2); // ignore context request/response, we're testing this elsewhere
    }

    async function getOpenAIResponse(conversationSimulatorCallback: ConversationSimulatorCallback) {
      const responseBody = await getResponseBody(
        {
          format: 'openai',
        },
        conversationSimulatorCallback
      );

      return responseBody;
    }

    before(async () => {
      proxy = await createLlmProxy(log);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      connectorId = await createProxyActionConnector({
        supertest,
        log,
        port: proxy.getPort(),
        internalReqHeader,
        roleAuthc,
      });
    });

    after(async () => {
      await deleteActionConnector({ supertest, connectorId, log, roleAuthc, internalReqHeader });
      proxy.close();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('after executing an action', () => {
      let events: StreamingChatResponseEvent[];

      before(async () => {
        events = await getEvents(
          {
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
          },
          async (conversationSimulator) => {
            await conversationSimulator.next({
              function_call: { name: 'my_action', arguments: JSON.stringify({ foo: 'bar' }) },
            });
            await conversationSimulator.complete();
          }
        );
      });

      it('closes the stream without persisting the conversation', () => {
        expect(
          pick(
            events[events.length - 1],
            'message.message.content',
            'message.message.function_call',
            'message.message.role'
          )
        ).to.eql({
          message: {
            message: {
              content: '',
              function_call: {
                name: 'my_action',
                arguments: JSON.stringify({ foo: 'bar' }),
                trigger: MessageRole.Assistant,
              },
              role: MessageRole.Assistant,
            },
          },
        });
      });
    });

    describe('after adding an instruction', () => {
      let body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

      before(async () => {
        await getEvents(
          {
            instructions: [
              {
                text: 'This is a random instruction',
                instruction_type: 'user_instruction',
              },
            ],
          },
          async (conversationSimulator) => {
            body = conversationSimulator.body;

            await conversationSimulator.next({
              function_call: { name: 'my_action', arguments: JSON.stringify({ foo: 'bar' }) },
            });
            await conversationSimulator.complete();
          }
        );
      });

      it('includes the instruction in the system message', async () => {
        expect(body.messages[0].content).to.contain('This is a random instruction');
      });
    });

    describe('with openai format', () => {
      let responseBody: string;

      before(async () => {
        responseBody = await getOpenAIResponse(async (conversationSimulator) => {
          await conversationSimulator.next('Hello');
          await conversationSimulator.complete();
        });
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
