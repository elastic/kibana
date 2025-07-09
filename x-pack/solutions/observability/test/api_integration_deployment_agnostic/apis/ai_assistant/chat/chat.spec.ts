/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { PassThrough } from 'stream';
import { times } from 'lodash';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';
import { createLlmProxy, LlmProxy } from '../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const SYSTEM_MESSAGE = `this is a system message`;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const messages: Message[] = [
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
    this.tags(['skipCloud']);
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
            systemMessage: SYSTEM_MESSAGE,
            messages,
            connectorId: 'does not exist',
            functions: [],
            scopes: ['all'],
          },
        },
      });
      expect(status).to.be(404);
    });

    // Fails on ECH: https://github.com/elastic/kibana/issues/219203
    it('returns a 200 if the connector exists', async () => {
      void proxy.interceptWithResponse('Hello from LLM Proxy');
      const { status } = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/chat',
        params: {
          body: {
            name: 'my_api_call',
            systemMessage: '',
            messages,
            connectorId,
            functions: [],
            scopes: ['all'],
          },
        },
      });
      await proxy.waitForAllInterceptorsToHaveBeenCalled();
      expect(status).to.be(200);
    });

    // Fails on ECH: https://github.com/elastic/kibana/issues/219203
    it('should forward the system message to the LLM', async () => {
      const simulatorPromise = proxy.interceptWithResponse('Hello from LLM Proxy');
      await observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/chat',
        params: {
          body: {
            name: 'my_api_call',
            systemMessage: SYSTEM_MESSAGE,
            messages,
            connectorId,
            functions: [],
            scopes: ['all'],
          },
        },
      });
      await proxy.waitForAllInterceptorsToHaveBeenCalled();
      const simulator = await simulatorPromise;
      const requestData = simulator.requestBody; // This is the request sent to the LLM
      expect(requestData.messages[0].content).to.eql(SYSTEM_MESSAGE);
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
            const chunks = times(NUM_RESPONSES).map((i) => `Part: ${i}\n`);
            void proxy.interceptWithResponse(chunks);

            const receivedChunks: Array<Record<string, any>> = [];

            const passThrough = new PassThrough();
            supertestEditorWithCookieCredentials
              .post('/internal/observability_ai_assistant/chat')
              .on('error', reject)
              .send({
                name: 'my_api_call',
                systemMessage: SYSTEM_MESSAGE,
                messages,
                connectorId,
                functions: [],
                scopes: ['all'],
              })
              .pipe(passThrough);

            passThrough.on('data', (chunk) => {
              receivedChunks.push(JSON.parse(chunk.toString()));
            });

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
              systemMessage: SYSTEM_MESSAGE,
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
