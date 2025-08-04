/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LlmProxy, createLlmProxy } from '../../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { invokeChatCompleteWithFunctionRequest } from '../../utils/conversation';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../utils/model_and_inference';
import { clearKnowledgeBase, getKnowledgeBaseEntriesFromApi } from '../../utils/knowledge_base';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('tool: summarize', function () {
    // LLM Proxy is not yet support in MKI: https://github.com/elastic/obs-ai-assistant-team/issues/199
    this.tags(['skipCloud']);
    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      await deployTinyElserAndSetupKb(getService);
      proxy = await createLlmProxy(log);

      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      // intercept the LLM request and return a fixed response
      void proxy.interceptWithResponse('Hello from LLM Proxy');

      await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'summarize',
          trigger: MessageRole.User,
          arguments: JSON.stringify({
            title: 'My Title',
            text: 'Hello world',
            public: false,
          }),
        },
      });

      await proxy.waitForAllInterceptorsToHaveBeenCalled();
    });

    after(async () => {
      proxy?.close();

      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await clearKnowledgeBase(es);
    });

    it('persists entry in knowledge base', async () => {
      const res = await getKnowledgeBaseEntriesFromApi({ observabilityAIAssistantAPIClient });

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
