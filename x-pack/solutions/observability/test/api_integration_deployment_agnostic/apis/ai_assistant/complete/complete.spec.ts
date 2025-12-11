/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MessageRole,
  type Message,
  type Conversation,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { Readable } from 'stream';
import { last, omit, pick } from 'lodash';
import { PassThrough } from 'stream';
import expect from '@kbn/expect';
import type {
  ChatCompletionChunkEvent,
  ConversationCreateEvent,
  MessageAddEvent,
  StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import { StreamingChatResponseEventType } from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import type { ObservabilityAIAssistantScreenContextRequest } from '@kbn/observability-ai-assistant-plugin/common/types';
import type { SupertestWithRoleScope } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';
import type { LlmProxy } from '../utils/create_llm_proxy';
import { createLlmProxy } from '../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  systemMessageSorted,
  clearConversations,
  decodeEvents,
  getConversationCreatedEvent,
  invokeChatCompleteWithFunctionRequest,
  getMessageAddedEvents,
  chatComplete,
  getConversationById,
} from '../utils/conversation';

interface NonStreamingChatResponse {
  conversationId: string | undefined;
  connectorId: string;
  data?: string;
}

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  async function getPersistedConversationById(
    conversationId: string | undefined
  ): Promise<Conversation | undefined> {
    const conversations = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/conversations',
    });

    return conversations.body.conversations.find(
      (conversation) => conversation.conversation.id === conversationId
    );
  }

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

      return decodeEvents(response.body as Readable).slice(2); // ignore context request/response, we're testing this elsewhere
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

    describe('when isStream:false and persist:true', () => {
      let nonStreamingResponse: NonStreamingChatResponse;
      const assistantResponse = 'Hello from non-streamed flow';

      before(async () => {
        await clearConversations(es);

        void proxy.interceptTitle('Title for non-streamed conversation');
        void proxy.interceptWithResponse(assistantResponse);

        const response = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: true,
              screenContexts: [],
              scopes: ['observability'],
              isStream: false,
            },
          },
        });

        expect(response.status).to.be(200);

        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        nonStreamingResponse = response.body as NonStreamingChatResponse;
      });

      after(async () => {
        await clearConversations(es);
      });

      it('returns the assistant response and conversation metadata', () => {
        expect(nonStreamingResponse.conversationId).to.be.a('string');
        expect(nonStreamingResponse.connectorId).to.be(connectorId);
        expect(nonStreamingResponse.data).to.be(assistantResponse);
      });

      it('persists the assistant response in the stored conversation', async () => {
        const persistedConversation = await getPersistedConversationById(
          nonStreamingResponse.conversationId
        );

        const lastMessage = last(persistedConversation?.messages)?.message;
        expect(lastMessage?.role).to.eql(MessageRole.Assistant);
        expect(lastMessage?.content).to.be(assistantResponse);
      });
    });

    describe('when isStream:false and persist:false', () => {
      let nonStreamingResponse: NonStreamingChatResponse;
      const assistantResponse = 'Hello from non-streamed flow without persistence';

      before(async () => {
        void proxy.interceptWithResponse(assistantResponse);

        const response = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: false,
              screenContexts: [],
              scopes: ['observability'],
              isStream: false,
            },
          },
        });

        expect(response.status).to.be(200);

        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        nonStreamingResponse = response.body as NonStreamingChatResponse;
      });

      it('returns the assistant response', () => {
        expect(nonStreamingResponse.conversationId).to.be(undefined);
        expect(nonStreamingResponse.connectorId).to.be(connectorId);
        expect(nonStreamingResponse.data).to.be(assistantResponse);
      });

      it('does not persist the conversation', async () => {
        const persistedConversation = await getPersistedConversationById(
          nonStreamingResponse.conversationId
        );
        expect(persistedConversation).to.be(undefined);
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

        conversationCreatedEvent = getConversationCreatedEvent(createResponse.body as Readable);
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

    describe('when calling a tool', () => {
      describe('when calling a tool that is not available', () => {
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

        describe('when invoking the /chat/complete with the tool request', function () {
          let events: MessageAddEvent[];

          before(async () => {
            void proxy.interceptWithResponse('Hello from LLM Proxy');

            const responseBody = await invokeChatCompleteWithFunctionRequest({
              connectorId,
              observabilityAIAssistantAPIClient,
              functionCall: {
                name: 'unknown_tool',
                trigger: MessageRole.User,
                arguments: JSON.stringify({
                  foo: 'bar',
                }),
              },
            });

            await proxy.waitForAllInterceptorsToHaveBeenCalled();

            events = getMessageAddedEvents(responseBody);
          });

          it('includes the tool name and an error in the first message add event', () => {
            expect(events[0].message.message.name).to.be('unknown_tool');
            expect(events[0].message.message.content).to.contain('toolNotFoundError');
          });

          it('emits the second message add event that interacts with the LLM to fix the error', () => {
            expect(events[1].message.message.content).to.be('Hello from LLM Proxy');
          });
        });

        describe('when the LLM calls a tool that is not available', function () {
          let fullConversation: Conversation;
          before(async () => {
            void proxy.interceptTitle('LLM-generated title');

            void proxy.interceptWithFunctionRequest({
              name: 'unknown_tool',
              arguments: () =>
                JSON.stringify({
                  foo: 'bar',
                }),
              when: () => true,
            });

            void proxy.interceptWithResponse('Hello from LLM Proxy, again!');

            const { conversationCreateEvent } = await chatComplete({
              userPrompt: 'user prompt test spec',
              connectorId,
              persist: true,
              observabilityAIAssistantAPIClient,
            });

            await proxy.waitForAllInterceptorsToHaveBeenCalled();

            const conversationId = conversationCreateEvent.conversation.id;
            const conversationResponse = await getConversationById({
              observabilityAIAssistantAPIClient,
              conversationId,
            });

            expect(conversationResponse.status).to.be(200);
            fullConversation = conversationResponse.body;
          });

          after(async () => {
            await clearConversations(es);
          });

          it('returns the conversation with the correct messages', () => {
            expect(fullConversation.messages.length).to.be(6);
            // user prompt
            expect(fullConversation.messages[0].message.content).to.be('user prompt test spec');
            // context tool call
            expect(fullConversation.messages[1].message.function_call?.name).to.be('context');
            // context tool response
            expect(fullConversation.messages[2].message.name).to.be('context');
            // unknown tool call
            expect(fullConversation.messages[3].message.function_call?.name).to.be('unknown_tool');
            // unknown tool response with error message
            expect(fullConversation.messages[4].message.name).to.contain('unknown_tool');
            expect(fullConversation.messages[4].message.content).to.contain('toolNotFoundError');
            // interaction with the LLM to fix the error
            expect(fullConversation.messages[5].message.content).to.be(
              'Hello from LLM Proxy, again!'
            );
          });
        });
      });

      describe('when calling a tool with invalid arguments', () => {
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
        });
        describe('when invoking the /chat/complete with the function request and invalid arguments', function () {
          let events: MessageAddEvent[];

          before(async () => {
            void proxy.interceptWithResponse('Hello from LLM Proxy');

            const responseBody = await invokeChatCompleteWithFunctionRequest({
              connectorId,
              observabilityAIAssistantAPIClient,
              functionCall: {
                name: 'kibana',
                trigger: MessageRole.User,
                arguments: JSON.stringify({
                  foo: 'bar',
                }),
              },
            });

            await proxy.waitForAllInterceptorsToHaveBeenCalled();

            events = getMessageAddedEvents(responseBody);
          });

          it('includes the tool name and an error in the first message add event', () => {
            expect(events[0].message.message.name).to.be('kibana');
            expect(events[0].message.message.content).to.contain(
              'Tool call arguments for kibana were invalid'
            );
          });

          it('emits the second message add event that interacts with the LLM to fix the error', () => {
            expect(events[1].message.message.content).to.be('Hello from LLM Proxy');
          });
        });

        describe('when the LLM calls a tool with invalid arguments', function () {
          let fullConversation: Conversation;
          before(async () => {
            void proxy.interceptTitle('LLM-generated title');

            void proxy.interceptWithFunctionRequest({
              name: 'kibana',
              arguments: () =>
                JSON.stringify({
                  foo: 'bar',
                }),
              when: () => true,
            });

            void proxy.interceptWithResponse('I will not call the kibana function!');
            void proxy.interceptWithResponse('Hello from LLM Proxy, again!');

            const { conversationCreateEvent } = await chatComplete({
              userPrompt: 'user prompt test spec',
              connectorId,
              persist: true,
              observabilityAIAssistantAPIClient,
            });

            await proxy.waitForAllInterceptorsToHaveBeenCalled();

            const conversationId = conversationCreateEvent.conversation.id;
            const conversationResponse = await getConversationById({
              observabilityAIAssistantAPIClient,
              conversationId,
            });
            expect(conversationResponse.status).to.be(200);
            fullConversation = conversationResponse.body;
          });

          after(async () => {
            await clearConversations(es);
          });

          it('returns the conversation with the correct messages', () => {
            expect(fullConversation.messages.length).to.be(6);
            // user prompt
            expect(fullConversation.messages[0].message.content).to.be('user prompt test spec');
            // context tool call
            expect(fullConversation.messages[1].message.function_call?.name).to.be('context');
            // context tool response
            expect(fullConversation.messages[2].message.name).to.be('context');
            // kibana tool call
            expect(fullConversation.messages[3].message.function_call?.name).to.be('kibana');
            // kibana tool response with error message
            expect(fullConversation.messages[4].message.name).to.contain('kibana');
            expect(fullConversation.messages[4].message.content).to.contain(
              'Tool call arguments for kibana were invalid'
            );
            // interaction with the LLM to fix the error
            expect(fullConversation.messages[5].message.content).to.be(
              'Hello from LLM Proxy, again!'
            );
          });
        });
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
