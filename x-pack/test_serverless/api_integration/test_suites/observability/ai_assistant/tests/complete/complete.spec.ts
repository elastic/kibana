/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Response } from 'supertest';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { omit, pick } from 'lodash';
import { PassThrough } from 'stream';
import expect from '@kbn/expect';
import {
  ChatCompletionChunkEvent,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  MessageAddEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import { ObservabilityAIAssistantScreenContextRequest } from '@kbn/observability-ai-assistant-plugin/common/types';
import {
  createLlmProxy,
  isFunctionTitleRequest,
  LlmProxy,
  LlmResponseSimulator,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/common/create_llm_proxy';
import { createOpenAiChunk } from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/common/create_openai_chunk';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  decodeEvents,
  getConversationCreatedEvent,
  getConversationUpdatedEvent,
} from '../conversations/helpers';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  const COMPLETE_API_URL = `/internal/observability_ai_assistant/chat/complete`;

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
        // make sure it doesn't 400 on `data` being set
        data: '{}',
      },
    },
  ];

  describe('/internal/observability_ai_assistant/chat/complete', function () {
    // TODO: https://github.com/elastic/kibana/issues/192751
    this.tags(['skipMKI']);
    let proxy: LlmProxy;
    let connectorId: string;
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    async function getEvents(
      params: { screenContexts?: ObservabilityAIAssistantScreenContextRequest[] },
      cb: (conversationSimulator: LlmResponseSimulator) => Promise<void>
    ) {
      const titleInterceptor = proxy.intercept('title', (body) => isFunctionTitleRequest(body));

      const conversationInterceptor = proxy.intercept(
        'conversation',
        (body) => !isFunctionTitleRequest(body)
      );
      const responsePromise = new Promise<Response>((resolve, reject) => {
        supertestWithoutAuth
          .post(COMPLETE_API_URL)
          .set(roleAuthc.apiKeyHeader)
          .set(internalReqHeader)
          .send({
            messages,
            connectorId,
            persist: true,
            screenContexts: params.screenContexts || [],
            scope: 'all',
          })
          .then((response: Response) => resolve(response))
          .catch((err: Error) => reject(err));
      });

      const [conversationSimulator, titleSimulator] = await Promise.all([
        conversationInterceptor.waitForIntercept(),
        titleInterceptor.waitForIntercept(),
      ]);

      await titleSimulator.status(200);
      await titleSimulator.next('My generated title');
      await titleSimulator.complete();

      await conversationSimulator.status(200);
      await cb(conversationSimulator);

      const response = await responsePromise;

      return (
        String(response.body)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line) as StreamingChatResponseEvent)
          // Filter BufferFlush events that appear if isCloudEnabled is true which is the case in serverless tests
          .filter((event) => event.type !== StreamingChatResponseEventType.BufferFlush)
          .slice(2)
      ); // ignore context request/response, we're testing this elsewhere
    }

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector({
        supertest: supertestWithoutAuth,
        log,
        port: proxy.getPort(),
        roleAuthc,
        internalReqHeader,
      });
    });

    after(async () => {
      proxy.close();
      await deleteActionConnector({
        supertest: supertestWithoutAuth,
        connectorId,
        log,
        roleAuthc,
        internalReqHeader,
      });
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns a streaming response from the server', async () => {
      const interceptor = proxy.intercept('conversation', () => true);

      const receivedChunks: any[] = [];

      const passThrough = new PassThrough();

      supertestWithoutAuth
        .post(COMPLETE_API_URL)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader)
        .send({
          messages,
          connectorId,
          persist: false,
          screenContexts: [],
          scope: 'all',
        })
        .pipe(passThrough);

      passThrough.on('data', (chunk) => {
        receivedChunks.push(chunk.toString());
      });

      const simulator = await interceptor.waitForIntercept();

      await simulator.status(200);
      const chunk = JSON.stringify(createOpenAiChunk('Hello'));

      await simulator.rawWrite(`data: ${chunk.substring(0, 10)}`);
      await simulator.rawWrite(`${chunk.substring(10)}\n\n`);
      await simulator.complete();

      await new Promise<void>((resolve) => passThrough.on('end', () => resolve()));

      const parsedEvents = decodeEvents(receivedChunks.join(''));

      expect(parsedEvents.map((event) => event.type)).to.eql([
        StreamingChatResponseEventType.MessageAdd,
        StreamingChatResponseEventType.MessageAdd,
        StreamingChatResponseEventType.ChatCompletionChunk,
        StreamingChatResponseEventType.MessageAdd,
      ]);

      const messageEvents = parsedEvents.filter(
        (msg): msg is MessageAddEvent => msg.type === StreamingChatResponseEventType.MessageAdd
      );

      const chunkEvents = parsedEvents.filter(
        (msg): msg is ChatCompletionChunkEvent =>
          msg.type === StreamingChatResponseEventType.ChatCompletionChunk
      );

      expect(omit(messageEvents[0], 'id', 'message.@timestamp')).to.eql({
        type: StreamingChatResponseEventType.MessageAdd,
        message: {
          message: {
            content: '',
            role: MessageRole.Assistant,
            function_call: {
              name: 'context',
              trigger: MessageRole.Assistant,
            },
          },
        },
      });

      expect(omit(messageEvents[1], 'id', 'message.@timestamp')).to.eql({
        type: StreamingChatResponseEventType.MessageAdd,
        message: {
          message: {
            role: MessageRole.User,
            name: 'context',
            content: JSON.stringify({ screen_description: '', learnings: [] }),
          },
        },
      });

      expect(omit(chunkEvents[0], 'id')).to.eql({
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        message: {
          content: 'Hello',
        },
      });

      expect(omit(messageEvents[2], 'id', 'message.@timestamp')).to.eql({
        type: StreamingChatResponseEventType.MessageAdd,
        message: {
          message: {
            content: 'Hello',
            role: MessageRole.Assistant,
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant,
            },
          },
        },
      });
    });
    describe('when creating a new conversation', () => {
      let events: StreamingChatResponseEvent[];

      before(async () => {
        events = await getEvents({}, async (conversationSimulator) => {
          await conversationSimulator.next('Hello');
          await conversationSimulator.next(' again');
          await conversationSimulator.complete();
        });
      });

      it('creates a new conversation', async () => {
        expect(omit(events[0], 'id')).to.eql({
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: 'Hello',
          },
        });
        expect(omit(events[1], 'id')).to.eql({
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: ' again',
          },
        });
        expect(omit(events[2], 'id', 'message.@timestamp')).to.eql({
          type: StreamingChatResponseEventType.MessageAdd,
          message: {
            message: {
              content: 'Hello again',
              function_call: {
                arguments: '',
                name: '',
                trigger: MessageRole.Assistant,
              },
              role: MessageRole.Assistant,
            },
          },
        });

        expect(
          omit(
            events[3],
            'conversation.id',
            'conversation.last_updated',
            'conversation.token_count'
          )
        ).to.eql({
          type: StreamingChatResponseEventType.ConversationCreate,
          conversation: {
            title: 'My generated title',
          },
        });

        const tokenCount = (events[3] as ConversationCreateEvent).conversation.token_count!;

        expect(tokenCount.completion).to.be.greaterThan(0);
        expect(tokenCount.prompt).to.be.greaterThan(0);

        expect(tokenCount.total).to.eql(tokenCount.completion + tokenCount.prompt);
      });

      after(async () => {
        const createdConversationId = events.filter(
          (line): line is ConversationCreateEvent =>
            line.type === StreamingChatResponseEventType.ConversationCreate
        )[0]?.conversation.id;

        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            roleAuthc,
            internalReqHeader,
            params: {
              path: {
                conversationId: createdConversationId,
              },
            },
          })
          .expect(200);
      });
    });

    describe('after executing a screen context action', () => {
      let events: StreamingChatResponseEvent[];

      before(async () => {
        events = await getEvents(
          {
            screenContexts: [
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

      it('does not store the conversation', async () => {
        expect(
          events.filter((event) => event.type === StreamingChatResponseEventType.ConversationCreate)
            .length
        ).to.eql(0);

        const conversations = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        expect(conversations.body.conversations.length).to.be(0);
      });
    });

    describe('when updating an existing conversation', () => {
      let conversationCreatedEvent: ConversationCreateEvent;
      let conversationUpdatedEvent: ConversationUpdateEvent;

      before(async () => {
        void proxy
          .intercept('conversation_title', (body) => isFunctionTitleRequest(body), [
            {
              function_call: {
                name: 'title_conversation',
                arguments: JSON.stringify({ title: 'LLM-generated title' }),
              },
            },
          ])
          .completeAfterIntercept();

        void proxy
          .intercept('conversation', (body) => !isFunctionTitleRequest(body), 'Good morning, sir!')
          .completeAfterIntercept();

        const createResponse = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
            roleAuthc,
            internalReqHeader,
            params: {
              body: {
                messages,
                connectorId,
                persist: true,
                screenContexts: [],
                scope: 'all',
              },
            },
          })
          .expect(200);

        await proxy.waitForAllInterceptorsSettled();

        conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);

        const conversationId = conversationCreatedEvent.conversation.id;
        const fullConversation = await observabilityAIAssistantAPIClient.slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          internalReqHeader,
          roleAuthc,
          params: {
            path: {
              conversationId,
            },
          },
        });

        void proxy
          .intercept('conversation', (body) => !isFunctionTitleRequest(body), 'Good night, sir!')
          .completeAfterIntercept();

        const updatedResponse = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
            internalReqHeader,
            roleAuthc,
            params: {
              body: {
                messages: [
                  ...fullConversation.body.messages,
                  {
                    '@timestamp': new Date().toISOString(),
                    message: {
                      role: MessageRole.User,
                      content: 'Good night, bot!',
                    },
                  },
                ],
                connectorId,
                persist: true,
                screenContexts: [],
                conversationId,
                scope: 'all',
              },
            },
          })
          .expect(200);

        await proxy.waitForAllInterceptorsSettled();

        conversationUpdatedEvent = getConversationUpdatedEvent(updatedResponse.body);
      });

      after(async () => {
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
            params: {
              path: {
                conversationId: conversationCreatedEvent.conversation.id,
              },
            },
          })
          .expect(200);
      });

      it('has correct token count for a new conversation', async () => {
        expect(conversationCreatedEvent.conversation.token_count?.completion).to.be.greaterThan(0);
        expect(conversationCreatedEvent.conversation.token_count?.prompt).to.be.greaterThan(0);
        expect(conversationCreatedEvent.conversation.token_count?.total).to.be.greaterThan(0);
      });

      it('has correct token count for the updated conversation', async () => {
        expect(conversationUpdatedEvent.conversation.token_count!.total).to.be.greaterThan(
          conversationCreatedEvent.conversation.token_count!.total
        );
      });
    });

    // todo
    it.skip('executes a function', async () => {});
  });
}
