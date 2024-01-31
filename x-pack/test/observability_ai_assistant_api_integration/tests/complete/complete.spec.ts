/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Response } from 'supertest';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { omit } from 'lodash';
import { PassThrough } from 'stream';
import expect from '@kbn/expect';
import {
  ConversationCreateEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import type OpenAI from 'openai';
import { createLlmProxy, LlmProxy } from '../../common/create_llm_proxy';
import { createOpenAiChunk } from '../../common/create_openai_chunk';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
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
        content: 'Good morning!',
      },
    },
  ];

  describe('Complete', () => {
    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      proxy = await createLlmProxy();

      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OpenAI',
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
        })
        .pipe(passThrough);

      passThrough.on('data', (chunk) => {
        receivedChunks.push(chunk.toString());
      });

      const simulator = await interceptor.waitForIntercept();

      await simulator.status(200);
      const chunk = JSON.stringify(createOpenAiChunk('Hello'));

      await simulator.rawWrite(`data: ${chunk.substring(0, 10)}`);
      await simulator.rawWrite(`${chunk.substring(10)}\n`);
      await simulator.complete();

      await new Promise<void>((resolve) => passThrough.on('end', () => resolve()));

      const parsedChunks = receivedChunks
        .join('')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StreamingChatResponseEvent);

      expect(parsedChunks.length).to.be(2);
      expect(omit(parsedChunks[0], 'id')).to.eql({
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        message: {
          content: 'Hello',
        },
      });

      expect(omit(parsedChunks[1], 'id', 'message.@timestamp')).to.eql({
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
      let lines: StreamingChatResponseEvent[];
      before(async () => {
        const titleInterceptor = proxy.intercept(
          'title',
          (body) =>
            (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).messages
              .length === 1
        );

        const conversationInterceptor = proxy.intercept(
          'conversation',
          (body) =>
            (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).messages
              .length !== 1
        );

        const responsePromise = new Promise<Response>((resolve, reject) => {
          supertest
            .post(COMPLETE_API_URL)
            .set('kbn-xsrf', 'foo')
            .send({
              messages,
              connectorId,
              persist: true,
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
        await conversationSimulator.next('Hello');
        await conversationSimulator.next(' again');
        await conversationSimulator.complete();

        const response = await responsePromise;

        lines = String(response.body)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line) as StreamingChatResponseEvent);
      });

      it('creates a new conversation', async () => {
        expect(omit(lines[0], 'id')).to.eql({
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: 'Hello',
          },
        });
        expect(omit(lines[1], 'id')).to.eql({
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: ' again',
          },
        });
        expect(omit(lines[2], 'id', 'message.@timestamp')).to.eql({
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
        expect(omit(lines[3], 'conversation.id', 'conversation.last_updated')).to.eql({
          type: StreamingChatResponseEventType.ConversationCreate,
          conversation: {
            title: 'My generated title',
          },
        });
      });

      after(async () => {
        const createdConversationId = lines.filter(
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

    // todo
    it.skip('updates an existing conversation', async () => {});

    // todo
    it.skip('executes a function', async () => {});
  });
}
