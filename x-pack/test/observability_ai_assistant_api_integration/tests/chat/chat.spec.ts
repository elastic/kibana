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

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

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

  describe('Chat', () => {
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

    after(() => {
      proxy.close();
    });

    it("returns a 4xx if the connector doesn't exist", async () => {
      await supertest
        .post(CHAT_API_URL)
        .set('kbn-xsrf', 'foo')
        .send({
          messages,
          connectorId: 'does not exist',
          functions: [],
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
            const receivedChunks: any[] = [];

            const passThrough = new PassThrough();
            supertest
              .post(CHAT_API_URL)
              .set('kbn-xsrf', 'foo')
              .on('error', reject)
              .send({
                messages,
                connectorId,
                functions: [],
              })
              .pipe(passThrough);

            const simulator = await interceptor.waitForIntercept();

            passThrough.on('data', (chunk) => {
              receivedChunks.push(chunk.toString());
            });

            for (let i = 0; i < NUM_RESPONSES; i++) {
              await simulator.next(`Part: i\n`);
            }

            await simulator.complete();

            await new Promise<void>((innerResolve) => passThrough.on('end', () => innerResolve()));

            expect(receivedChunks.length).to.eql(
              NUM_RESPONSES,
              'received no of chunks did not match expected. This might be because of a 4xx or 5xx'
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
          messages,
          connectorId,
          functions: [],
        })
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

      const response = JSON.parse(data);

      expect(response.message).to.contain(
        `an error occurred while running the action - Status code: 400. Message: API Error: Bad Request - This model's maximum context length is 8192 tokens. However, your messages resulted in 11036 tokens. Please reduce the length of the messages.`
      );
    });

    after(async () => {
      await supertest
        .delete(`/api/actions/connector/${connectorId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  });
}
