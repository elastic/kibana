/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { omit, pick } from 'lodash';
import { PassThrough } from 'stream';
import expect from '@kbn/expect';
import {
  ChatCompletionChunkEvent,
  ConversationCreateEvent,
  MessageAddEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import { ObservabilityAIAssistantScreenContextRequest } from '@kbn/observability-ai-assistant-plugin/common/types';
import { createLlmProxy, LlmProxy } from '../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { SupertestWithRoleScope } from '../../../../services/role_scoped_supertest';
import {
  systemMessageSorted,
  clearConversations,
  decodeEvents,
  getConversationCreatedEvent,
} from '../utils/conversation';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  const messages: Message[] = [
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
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['skipCloud']);
    let proxy: LlmProxy;
    let connectorId: string;

    async function getEvents(params: {
      screenContexts?: ObservabilityAIAssistantScreenContextRequest[];
    }) {
      const response = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
        params: {
          body: {
            messages,
            connectorId,
            persist: true,
            screenContexts: params.screenContexts || [],
            scopes: ['all'],
          },
        },
      });

      await proxy.waitForAllInterceptorsToHaveBeenCalled();

      return decodeEvents(response.body).slice(2); // ignore context request/response, we're testing this elsewhere
    }

    before(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
    });

    describe('returns a streaming response from the server', () => {
      let parsedEvents: StreamingChatResponseEvent[];
      before(async () => {
        const supertestEditorWithCookieCredentials: SupertestWithRoleScope =
          await roleScopedSupertest.getSupertestWithRoleScope('editor', {
            useCookieHeader: true,
            withInternalHeaders: true,
          });

        proxy.interceptWithResponse('Hello!').catch((e) => {
          log.error(`Failed to intercept conversation ${e}`);
        });

        const passThrough = new PassThrough();
        supertestEditorWithCookieCredentials
          .post('/internal/observability_ai_assistant/chat/complete')
          .set('kbn-xsrf', 'foo')
          .send({
            messages,
            connectorId,
            persist: false,
            screenContexts: [],
            scopes: ['all'],
          })
          .pipe(passThrough);

        const receivedChunks: string[] = [];
        passThrough.on('data', (chunk) => {
          receivedChunks.push(chunk.toString());
        });

        await new Promise<void>((resolve) => passThrough.on('end', () => resolve()));

        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        parsedEvents = decodeEvents(receivedChunks.join(''));
      });

      it('returns the correct sequence of event types', async () => {
        expect(
          parsedEvents
            .map((event) => event.type)
            .filter((eventType) => eventType !== StreamingChatResponseEventType.BufferFlush)
        ).to.eql([
          StreamingChatResponseEventType.MessageAdd,
          StreamingChatResponseEventType.MessageAdd,
          StreamingChatResponseEventType.ChatCompletionChunk,
          StreamingChatResponseEventType.ChatCompletionMessage,
          StreamingChatResponseEventType.MessageAdd,
        ]);
      });

      it('has a ChatCompletionChunk event', () => {
        const chunkEvents = parsedEvents.filter(
          (msg): msg is ChatCompletionChunkEvent =>
            msg.type === StreamingChatResponseEventType.ChatCompletionChunk
        );

        expect(omit(chunkEvents[0], 'id')).to.eql({
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: 'Hello!',
          },
        });
      });

      it('has MessageAdd events', () => {
        const messageEvents = parsedEvents.filter(
          (msg): msg is MessageAddEvent => msg.type === StreamingChatResponseEventType.MessageAdd
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

        expect(omit(messageEvents[2], 'id', 'message.@timestamp')).to.eql({
          type: StreamingChatResponseEventType.MessageAdd,
          message: {
            message: {
              content: 'Hello!',
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
    });

    describe('LLM invocation with system message', () => {
      let systemMessage: string;
      before(async () => {
        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions',
          params: {
            query: {
              scopes: ['all'],
            },
          },
        });

        expect(status).to.be(200);
        systemMessage = body.systemMessage;
      });

      it('forwards the system message as the first message in the request to the LLM with message role "system"', async () => {
        const simulatorPromise = proxy.interceptWithResponse('Hello from LLM Proxy');
        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: false,
              screenContexts: [],
              scopes: ['all'],
            },
          },
        });
        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestData = simulator.requestBody;
        expect(requestData.messages[0].role).to.eql('system');
        expect(systemMessageSorted(requestData.messages[0].content as string)).to.eql(
          systemMessageSorted(systemMessage)
        );
      });
    });

    describe('when creating a new conversation', () => {
      let events: StreamingChatResponseEvent[];

      before(async () => {
        void proxy.interceptTitle('Title for a new conversation');
        void proxy.interceptWithResponse('Hello again');

        const allEvents = await getEvents({});
        events = allEvents.filter(
          (event) => event.type !== StreamingChatResponseEventType.BufferFlush
        );
      });

      it('has the correct events', async () => {
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
          type: StreamingChatResponseEventType.ChatCompletionMessage,
          message: {
            content: 'Hello again',
          },
        });
        expect(omit(events[3], 'id', 'message.@timestamp')).to.eql({
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
      });

      it('has the correct title', () => {
        expect(omit(events[4], 'conversation.id', 'conversation.last_updated')).to.eql({
          type: StreamingChatResponseEventType.ConversationCreate,
          conversation: {
            title: 'Title for a new conversation',
          },
        });
      });

      after(async () => {
        await clearConversations(es);
      });
    });

    describe('after executing a screen context action', () => {
      let events: StreamingChatResponseEvent[];

      before(async () => {
        void proxy.interceptTitle('Title for conversation with screen context action');
        void proxy.interceptWithFunctionRequest({
          name: 'my_action',
          arguments: () => JSON.stringify({ foo: 'bar' }),
        });

        events = await getEvents({
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
        });
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

        const conversations = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversations',
        });

        expect(conversations.status).to.be(200);

        expect(conversations.body.conversations.length).to.be(0);
      });
    });

    describe('when updating an existing conversation', () => {
      let conversationCreatedEvent: ConversationCreateEvent;

      before(async () => {
        proxy.interceptTitle('LLM-generated title').catch((e) => {
          throw new Error('Failed to intercept conversation title', e);
        });

        proxy.interceptWithResponse('Good night, sir!').catch((e) => {
          throw new Error('Failed to intercept conversation ', e);
        });

        const createResponse = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: true,
              screenContexts: [],
              scopes: ['observability'],
            },
          },
        });

        expect(createResponse.status).to.be(200);

        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);

        const conversationId = conversationCreatedEvent.conversation.id;
        const fullConversation = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId,
            },
          },
        });

        proxy.interceptWithResponse('Good night, sir!').catch((e) => {
          log.error(`Failed to intercept conversation ${e}`);
        });

        const updatedResponse = await observabilityAIAssistantAPIClient.editor({
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
              scopes: ['observability'],
            },
          },
        });

        expect(updatedResponse.status).to.be(200);

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      after(async () => {
        await clearConversations(es);
      });
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: false,
              screenContexts: [],
              scopes: ['all'],
            },
          },
        });
        expect(status).to.be(403);
      });
    });
  });
}
