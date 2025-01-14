/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { PassThrough } from 'stream';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { SupertestWithRoleScope } from '../../../../services/role_scoped_supertest';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

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

  describe('/internal/observability_ai_assistant/chat', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
    let proxy: LlmProxy;

    let connectorId: string;

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

    it("returns a 4xx if the connector doesn't exist", async () => {
      const { status } = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/chat',
        params: {
          body: {
            name: 'my_api_call',
            messages,
            connectorId: 'does not exist',
            functions: [],
            scopes: ['all'],
          },
        },
      });
      expect(status).to.be(404);
    });
    it('returns a streaming response from the server', async () => {
      const NUM_RESPONSES = 5;
      const roleScopedSupertest = getService('roleScopedSupertest');
      const supertestEditorWithCookieCredentials: SupertestWithRoleScope =
        await roleScopedSupertest.getSupertestWithRoleScope('editor', {
          useCookieHeader: true,
          withInternalHeaders: true,
        });

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
            supertestEditorWithCookieCredentials
              .post('/internal/observability_ai_assistant/chat')
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
              await simulator.next(`Part: ${i}\n`);
            }

            await simulator.tokenCount({ completion: 20, prompt: 33, total: 53 });

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
    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
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
        expect(status).to.be(403);
      });
    });
  });
}
