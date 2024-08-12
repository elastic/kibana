/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LlmProxy } from '../../../common/create_llm_proxy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createLLMProxyConnector,
  deleteLLMProxyConnector,
  invokeChatCompleteWithFunctionRequest,
} from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  // Skipped until Elser is available in tests
  describe.skip('when calling summarize function', () => {
    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      ({ connectorId, proxy } = await createLLMProxyConnector({ log, supertest }));

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
      await deleteLLMProxyConnector({ supertest, connectorId, proxy });
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
