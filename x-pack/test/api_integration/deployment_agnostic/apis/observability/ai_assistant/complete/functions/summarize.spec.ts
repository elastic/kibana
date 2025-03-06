/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { invokeChatCompleteWithFunctionRequest } from './helpers';
import {
  clearKnowledgeBase,
  importTinyElserModel,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
  setupKnowledgeBase,
  waitForKnowledgeBaseReady,
} from '../../knowledge_base/helpers';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const ml = getService('ml');
  const es = getService('es');
  const retry = getService('retry');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('when calling summarize function', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      await importTinyElserModel(ml);
      await setupKnowledgeBase(observabilityAIAssistantAPIClient);
      await waitForKnowledgeBaseReady({ observabilityAIAssistantAPIClient, log, retry });

      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      // intercept the LLM request and return a fixed response
      void proxy.interceptConversation('Hello from LLM Proxy');

      await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'summarize',
          trigger: MessageRole.User,
          arguments: JSON.stringify({
            title: 'My Title',
            text: 'Hello world',
            is_correction: false,
            confidence: 'high',
            public: false,
          }),
        },
      });

      await proxy.waitForAllInterceptorsToHaveBeenCalled();
    });

    after(async () => {
      proxy.close();

      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
      await deleteKnowledgeBaseModel(ml);
      await clearKnowledgeBase(es);
      await deleteInferenceEndpoint({ es });
    });

    it('persists entry in knowledge base', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
        params: {
          query: {
            query: '',
            sortBy: 'title',
            sortDirection: 'asc',
          },
        },
      });

      const { role, public: isPublic, text, type, user, title } = res.body.entries[0];

      expect(role).to.eql('assistant_summarization');
      expect(isPublic).to.eql(false);
      expect(text).to.eql('Hello world');
      expect(type).to.eql('contextual');
      expect(user?.name).to.eql('elastic_editor');
      expect(title).to.eql('My Title');
      expect(res.body.entries).to.have.length(1);
    });
  });
}
