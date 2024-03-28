/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Response } from 'supertest';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { omit, pick } from 'lodash';
import { PassThrough, Readable } from 'stream';
import expect from '@kbn/expect';
import {
  ChatCompletionChunkEvent,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  MessageAddEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import type OpenAI from 'openai';
import { ObservabilityAIAssistantScreenContextRequest } from '@kbn/observability-ai-assistant-plugin/common/types';
import { createLlmProxy, LlmProxy, LlmResponseSimulator } from '../../common/create_llm_proxy';
import { createOpenAiChunk } from '../../common/create_openai_chunk';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

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
      },
    },
  ];

  describe('Complete', () => {
    let proxy: LlmProxy;
    let connectorId: string;

    async function getEvents(
      params: { screenContexts?: ObservabilityAIAssistantScreenContextRequest[] },
      cb: (conversationSimulator: LlmResponseSimulator) => Promise<void>
    ) {
      const titleInterceptor = proxy.intercept(
        'title',
        (body) =>
          (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).functions?.find(
            (fn) => fn.name === 'title_conversation'
          ) !== undefined
      );

      const conversationInterceptor = proxy.intercept(
        'conversation',
        (body) =>
          (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).functions?.find(
            (fn) => fn.name === 'title_conversation'
          ) === undefined
      );

      const responsePromise = new Promise<Response>((resolve, reject) => {
        supertest
          .post(COMPLETE_API_URL)
          .set('kbn-xsrf', 'foo')
          .send({
            messages,
            connectorId,
            persist: true,
            screenContexts: params.screenContexts || [],
          })
          .end((err, response) => {
            if (err) {
              return reject(err);
            }
            return resolve(response);
          });
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

      return String(response.body)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StreamingChatResponseEvent)
        .slice(2); // ignore context request/response, we're testing this elsewhere
    }

    before(async () => {
      proxy = await createLlmProxy(log);

      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OpenAI Proxy',
          connector_type_id: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: `http://localhost:${proxy.getPort()}`,
          },
          secrets: {
            apiKey: 'my-api-key',
          },
        })
        .expect(200);

      connectorId = response.body.id;
    });

    after(async () => {
      await supertest
        .delete(`/api/actions/connector/${connectorId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      proxy.close();
    });

    it('returns a streaming response from the server', async () => {
      const interceptor = proxy.intercept('conversation', () => true);

      const receivedChunks: any[] = [];

      const passThrough = new PassThrough();

      supertest
        .post(COMPLETE_API_URL)
        .set('kbn-xsrf', 'foo')
        .send({
          messages,
          connectorId,
          persist: false,
          screenContexts: [],
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
              arguments: JSON.stringify({ queries: [], categories: [] }),
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

    describe('when creating a new conversation', async () => {
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
        expect(omit(events[3], 'conversation.id', 'conversation.last_updated')).to.eql({
          type: StreamingChatResponseEventType.ConversationCreate,
          conversation: {
            title: 'My generated title',
            token_count: {
              completion: 7,
              prompt: 2262,
              total: 2269,
            },
          },
        });
      });

      after(async () => {
        const createdConversationId = events.filter(
          (line): line is ConversationCreateEvent =>
            line.type === StreamingChatResponseEventType.ConversationCreate
        )[0]?.conversation.id;

        await observabilityAIAssistantAPIClient
          .writeUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createdConversationId,
              },
            },
          })
          .expect(200);
      });
    });

    describe('after executing a screen context action', async () => {
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
          .writeUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          })
          .expect(200);

        expect(conversations.body.conversations.length).to.be(0);
      });
    });

    describe('when updating an existing conversation', async () => {
      let conversationCreatedEvent: ConversationCreateEvent;
      let conversationUpdatedEvent: ConversationUpdateEvent;

      function getConversationCreatedEvent(body: Readable | string) {
        const decodedEvents = decodeEvents(body);
        return decodedEvents.find(
          (event) => event.type === StreamingChatResponseEventType.ConversationCreate
        ) as ConversationCreateEvent;
      }

      function getConversationUpdatedEvent(body: Readable | string) {
        const decodedEvents = decodeEvents(body);
        return decodedEvents.find(
          (event) => event.type === StreamingChatResponseEventType.ConversationUpdate
        ) as ConversationUpdateEvent;
      }

      before(async () => {
        proxy
          .intercept('conversation_title', (body) => isFunctionTitleRequest(body), [
            {
              function_call: {
                name: 'title_conversation',
                arguments: JSON.stringify({ title: 'LLM-generated title' }),
              },
            },
          ])
          .complete();

        proxy
          .intercept('conversation', (body) => !isFunctionTitleRequest(body), 'Good morning, sir!')
          .complete();

        const createResponse = await observabilityAIAssistantAPIClient
          .writeUser({
            endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
            params: {
              body: {
                messages,
                connectorId,
                persist: true,
                screenContexts: [],
              },
            },
          })
          .expect(200);

        await proxy.waitForAllInterceptorsSettled();

        conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);

        const conversationId = conversationCreatedEvent.conversation.id;
        const fullConversation = await observabilityAIAssistantAPIClient.readUser({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId,
            },
          },
        });

        proxy
          .intercept('conversation', (body) => !isFunctionTitleRequest(body), 'Good night, sir!')
          .complete();

        const updatedResponse = await observabilityAIAssistantAPIClient
          .writeUser({
            endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
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
              },
            },
          })
          .expect(200);

        await proxy.waitForAllInterceptorsSettled();

        conversationUpdatedEvent = getConversationUpdatedEvent(updatedResponse.body);
      });

      after(async () => {
        await observabilityAIAssistantAPIClient
          .writeUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: conversationCreatedEvent.conversation.id,
              },
            },
          })
          .expect(200);
      });

      it('has correct token count for a new conversation', async () => {
        expect(conversationCreatedEvent.conversation.token_count).to.eql({
          completion: 21,
          prompt: 2262,
          total: 2283,
        });
      });

      it('has correct token count for the updated conversation', async () => {
        expect(conversationUpdatedEvent.conversation.token_count).to.eql({
          completion: 31,
          prompt: 4522,
          total: 4553,
        });
      });
    });

    // todo
    it.skip('executes a function', async () => {});
  });
}

function decodeEvents(body: Readable | string) {
  return String(body)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamingChatResponseEvent);
}

function isFunctionTitleRequest(body: string) {
  const parsedBody = JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
  return parsedBody.functions?.find((fn) => fn.name === 'title_conversation') !== undefined;
}
