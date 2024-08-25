/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LlmProxy, createLlmProxy } from '../../../common/create_llm_proxy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { invokeChatCompleteWithFunctionRequest } from './helpers';
import {
  createProxyActionConnector,
  deleteActionConnector,
} from '../../../common/action_connectors';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  // Skipped until Elser is available in tests
  describe.skip('when calling summarize function', () => {
    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector({ supertest, log, port: proxy.getPort() });

      // intercept the LLM request and return a fixed response
      void proxy
        .intercept('conversation', () => true, 'Hello from LLM Proxy')
        .completeAfterIntercept();

      await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'summarize',
          trigger: MessageRole.User,
          arguments: JSON.stringify({
            id: 'my-id',
            text: 'Hello world',
            is_correction: false,
            confidence: 1,
            public: false,
          }),
        },
      });

      await proxy.waitForAllInterceptorsSettled();
    });

    after(async () => {
      proxy.close();
      await deleteActionConnector({ supertest, connectorId, log });
    });

    it('persists entry in knowledge base', async () => {
      const res = await observabilityAIAssistantAPIClient.editorUser({
        endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
        params: {
          query: {
            query: '',
            sortBy: 'doc_id',
            sortDirection: 'asc',
          },
        },
      });

      expect(res.body.entries).to.have.length(1);
    });
  });
}
