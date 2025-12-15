/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  createLlmProxy,
  createLlmProxyConnector,
  deleteLlmProxyConnector,
  type LlmProxy,
} from '@kbn/llm-proxy-test-helper';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

/**
 * This is a sample test file demonstrating how to use the LLM proxy
 * for testing AI features in Security Solution without requiring a real AI connector.
 *
 * The LLM proxy pattern allows you to:
 * 1. Create a local HTTP server that mimics an OpenAI-compatible API
 * 2. Create a real .gen-ai connector that points to the proxy
 * 3. Intercept LLM requests and return predetermined responses
 * 4. Assert on what was sent to the "LLM" (request body inspection)
 *
 * Note: Tests using the LLM proxy should be tagged with 'skipCloud' since
 * the proxy runs on localhost and won't work in cloud environments.
 */
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  // Skip this test in cloud environments since the LLM proxy runs on localhost
  describe('@ess LLM Proxy Example', function () {
    // The proxy runs on localhost so it won't work in cloud environments
    this.tags(['skipCloud']);

    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      // 1. Create the LLM proxy server
      proxy = await createLlmProxy(log);

      // 2. Create a .gen-ai connector pointing to the proxy
      connectorId = await createLlmProxyConnector({
        supertest,
        proxy,
        name: 'Test LLM Proxy Connector',
      });

      log.info(`Created LLM proxy on port ${proxy.getPort()} with connector ID: ${connectorId}`);
    });

    after(async () => {
      // Clean up: close proxy and delete connector
      proxy?.close();
      if (connectorId) {
        await deleteLlmProxyConnector({ supertest, connectorId });
      }
    });

    afterEach(() => {
      // Clear interceptors and intercepted requests between tests
      proxy.clear();
    });

    describe('Basic Usage Examples', () => {
      it('should demonstrate how to intercept and mock a simple text response', async () => {
        // Register an interceptor that matches any user message
        const { completeAfterIntercept } = proxy.intercept({
          name: 'simple-response',
          when: (body) => body.messages.some((m) => m.role === 'user'),
          responseMock: 'This is a mocked LLM response for testing purposes.',
        });

        // The completeAfterIntercept() returns a promise that resolves when
        // the interceptor is called and the response is fully streamed
        void completeAfterIntercept();

        // At this point, you would call your API endpoint that uses the connector
        // For example:
        // await supertest.post('/api/your_ai_endpoint')
        //   .send({ connectorId, prompt: 'Hello' });

        // For demonstration, let's just verify the interceptor was registered
        expect(proxy.interceptedRequests).toHaveLength(0); // No requests yet
      });
    });
  });
};
