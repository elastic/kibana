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
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/common/create_llm_proxy';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  let supertestEditorWithCookieCredentials: SupertestWithRoleScope;

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

  describe('/internal/observability_ai_assistant/chat', function () {
    // TODO: https://github.com/elastic/kibana/issues/192751
    this.tags(['skipMKI']);
    let proxy: LlmProxy;
    let connectorId: string;
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();

      supertestEditorWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'editor',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );

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

    it("returns a 4xx if the connector doesn't exist", async () => {
      await supertestEditorWithCookieCredentials
        .post(CHAT_API_URL)
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
            supertestEditorWithCookieCredentials
              .post(CHAT_API_URL)
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
        await observabilityAIAssistantAPIClient
          .slsUnauthorized({
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
          })
          .expect(403);
      });
    });
  });
}
