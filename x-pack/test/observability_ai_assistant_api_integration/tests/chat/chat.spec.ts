/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { PassThrough } from 'stream';
import { createLlmProxy, LlmProxy } from '../../common/create_llm_proxy';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import { ForbiddenApiError } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  const CHAT_API_URL = `/internal/observability_ai_assistant/chat`;

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

  describe('/internal/observability_ai_assistant/chat', () => {
    let proxy: LlmProxy;

    let connectorId: string;

    before(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector({ supertest, log, port: proxy.getPort() });
    });

    after(async () => {
      proxy.close();
      await deleteActionConnector({ supertest, connectorId, log });
    });

    it("returns a 4xx if the connector doesn't exist", async () => {
      await supertest
        .post(CHAT_API_URL)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'my_api_call',
          messages,
          connectorId: 'does not exist',
          functions: [],
          scopes: ['all'],
        })
        .expect(404);
    });

    it('returns a streaming response from the server', async () => {
      const NUM_RESPONSES = 5;

      await Promise.race([
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Test timed out'));
          }, 5000);
        }),
        new Promise<void>((resolve, reject) => {
          async function runTest() {
            const interceptor = proxy.intercept('conversation', () => true);
            const receivedChunks: Array<Record<string, any>> = [];

            const passThrough = new PassThrough();
            supertest
              .post(CHAT_API_URL)
              .set('kbn-xsrf', 'foo')
              .on('error', reject)
              .send({
                name: 'my_api_call',
                messages,
                connectorId,
                functions: [],
                scopes: ['all'],
              })
              .pipe(passThrough);

            const simulator = await interceptor.waitForIntercept();

            passThrough.on('data', (chunk) => {
              receivedChunks.push(JSON.parse(chunk.toString()));
            });

            for (let i = 0; i < NUM_RESPONSES; i++) {
              await simulator.next(`Part: i\n`);
            }

            await simulator.complete();

            await new Promise<void>((innerResolve) => passThrough.on('end', () => innerResolve()));

            const chatCompletionChunks = receivedChunks.filter(
              (chunk) => chunk.type === 'chatCompletionChunk'
            );
            expect(chatCompletionChunks).to.have.length(
              NUM_RESPONSES,
              `received number of chat completion chunks did not match expected. This might be because of a 4xx or 5xx: ${JSON.stringify(
                chatCompletionChunks,
                null,
                2
              )}`
            );

            const tokenCountChunk = receivedChunks.find((chunk) => chunk.type === 'tokenCount');
            expect(tokenCountChunk).to.eql(
              {
                type: 'tokenCount',
                tokens: { completion: 20, prompt: 33, total: 53 },
              },
              `received token count chunk did not match expected`
            );
          }

          runTest().then(resolve, reject);
        }),
      ]);
    });

    it('returns a useful error if the request fails', async () => {
      const interceptor = proxy.intercept('conversation', () => true);

      const passThrough = new PassThrough();

      supertest
        .post(CHAT_API_URL)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'my_api_call',
          messages,
          connectorId,
          functions: [],
          scopes: ['all'],
        })
        .expect(200)
        .pipe(passThrough);

      let data: string = '';

      passThrough.on('data', (chunk) => {
        data += chunk.toString('utf-8');
      });

      const simulator = await interceptor.waitForIntercept();

      await simulator.status(400);

      await simulator.rawWrite(
        JSON.stringify({
          error: {
            code: 'context_length_exceeded',
            message:
              "This model's maximum context length is 8192 tokens. However, your messages resulted in 11036 tokens. Please reduce the length of the messages.",
            param: 'messages',
            type: 'invalid_request_error',
          },
        })
      );

      await simulator.rawEnd();

      await new Promise<void>((resolve) => passThrough.on('end', () => resolve()));

      const response = JSON.parse(data.trim());

      expect(response.error.message).to.be(
        `Token limit reached. Token limit is 8192, but the current conversation has 11036 tokens.`
      );
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        try {
          await observabilityAIAssistantAPIClient.unauthorizedUser({
            endpoint: `POST ${CHAT_API_URL}`,
            params: {
              body: {
                name: 'my_api_call',
                messages,
                connectorId,
                functions: [],
                scopes: ['all'],
              },
            },
          });
          throw new ForbiddenApiError('Expected unauthorizedUser() to throw a 403 Forbidden error');
        } catch (e) {
          expect(e.status).to.be(403);
        }
      });
    });
  });
}
