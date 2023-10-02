/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import getPort from 'get-port';
import http, { Server, ServerResponse } from 'http';
import { PassThrough } from 'stream';
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
    let requestHandler = (
      request: http.IncomingMessage,
      response: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage }
    ) => {};

    let connectorId: string;

    let server: Server;

    before(async () => {
      const port = await getPort({ port: getPort.makeRange(9000, 9100) });

      server = http
        .createServer((request, response) => {
          requestHandler(request, response);
        })
        .listen(port);

      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OpenAI',
          connector_type_id: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: `http://localhost:${port}`,
          },
          secrets: {
            apiKey: 'my-api-key',
          },
        })
        .expect(200);

      connectorId = response.body.id;
    });

    after(() => {
      server.close();
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

      async function writeChunks(response: ServerResponse) {
        const chunks = new Array(NUM_RESPONSES).fill(undefined).map(() => 'data: {}');
        for await (const chunk of chunks) {
          response.write(chunk);
          await new Promise((resolve) => {
            setTimeout(resolve, 100);
          });
        }
      }

      requestHandler = (request, response) => {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        writeChunks(response).then(() => {
          response.write('data: [DONE]');
          response.end();
        });
      };

      await Promise.race([
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Test timed out'));
          }, 5000);
        }),
        new Promise<void>((resolve, reject) => {
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

          passThrough.on('data', (chunk) => {
            receivedChunks.push(chunk.toString());
          });

          passThrough.on('end', () => {
            expect(receivedChunks.length).to.eql(
              NUM_RESPONSES + 1,
              'received no of chunks did not match expected. This might be because of a 4xx or 5xx'
            );
            resolve();
          });
        }),
      ]);
    });

    it('returns a useful error if the request fails', async () => {
      requestHandler = (request, response) => {
        response.writeHead(400, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        response.write(
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

        response.end();
      };

      const response = await supertest.post(CHAT_API_URL).set('kbn-xsrf', 'foo').send({
        messages,
        connectorId,
        functions: [],
      });

      expect(response.body.message).to.contain(
        `400 - Bad Request - This model's maximum context length is 8192 tokens. However, your messages resulted in 11036 tokens. Please reduce the length of the messages.`
      );
    });

    after(async () => {
      requestHandler = () => {};
      await supertest
        .delete(`/api/actions/connector/${connectorId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  });
}
