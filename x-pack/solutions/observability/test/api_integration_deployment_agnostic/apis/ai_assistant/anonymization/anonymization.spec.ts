/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { aiAssistantAnonymizationSettings } from '@kbn/inference-common';
import { createLlmProxy, LlmProxy } from '../utils/create_llm_proxy';
import { setAdvancedSettings } from '../utils/advanced_settings';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { clearConversations } from '../utils/conversation';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  let proxy: LlmProxy;
  let connectorId: string;

  const conversationsIndex = '.kibana-observability-ai-assistant-conversations-000001';

  describe('anonymization', function () {
    const userText1 = 'My name is Claudia and my email is claudia@example.com';
    const userText2 = 'my website is http://claudia.is';
    // LLM proxy is not working on MKI
    this.tags(['failsOnMKI']);

    before(async () => {
      await clearConversations(es);
      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      // configure anonymization rules for these tests
      await setAdvancedSettings(supertest, {
        [aiAssistantAnonymizationSettings]: JSON.stringify(
          {
            rules: [
              {
                entityClass: 'EMAIL',
                type: 'RegExp',
                pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
                enabled: true,
              },
              {
                entityClass: 'URL',
                type: 'RegExp',
                pattern: '(https?:\\/\\/[^\\s"\']+)',
                enabled: true,
              },
            ],
          },
          null,
          2
        ),
      });
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({ actionId: connectorId });
      await clearConversations(es);
      await setAdvancedSettings(supertest, {
        [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [] }),
      });
    });

    it('does not send detected entities to the LLM via chat/complete', async () => {
      void proxy.interceptTitle('Title for a new conversation');
      const simulatorPromise = proxy.interceptWithResponse('ok');

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
        params: {
          body: {
            messages: [
              {
                '@timestamp': new Date().toISOString(),
                message: { role: MessageRole.User, content: userText1 },
              } as Message,
              {
                '@timestamp': new Date().toISOString(),
                message: { role: MessageRole.User, content: userText2 },
              } as Message,
            ],
            connectorId,
            persist: true,
            screenContexts: [],
            scopes: ['all'],
          },
        },
      });

      expect(res.status).to.be(200);

      await proxy.waitForAllInterceptorsToHaveBeenCalled();
      const simulator = await simulatorPromise;

      const userMsgsReq = simulator.requestBody.messages.filter((m: any) => m.role === 'user');
      expect(userMsgsReq).to.have.length(2);
      // First message
      const firstMsgReq = userMsgsReq[0].content;
      expect(firstMsgReq).to.not.contain('claudia@example.com');
      expect(
        typeof firstMsgReq === 'string' && (firstMsgReq.match(/[0-9a-f]{40}/g) || []).length
      ).to.be(1);
      // Second message
      const secMsgReq = userMsgsReq[1].content;
      expect(secMsgReq).to.not.contain('http://claudia.is');
      expect(
        typeof secMsgReq === 'string' && (secMsgReq.match(/[0-9a-f]{40}/g) || []).length
      ).to.be(1);
    });

    it('stores original content and detected entities in Elasticsearch', async () => {
      // Refresh the index to make sure our document is searchable
      await es.indices.refresh({
        index: conversationsIndex,
      });
      const searchRes = await es.search({
        index: conversationsIndex,
        size: 1,
        sort: '@timestamp:desc',
      });
      const hit: any = searchRes.hits.hits[0]._source;
      // Find the stored user messages
      const storedUserMsgs = hit.messages
        .filter(
          (m: any) =>
            m.message.role === 'user' &&
            (m.message.content === userText1 || m.message.content === userText2)
        )
        .map((m: any) => m.message);
      expect(storedUserMsgs).to.have.length(2);

      // First stored message
      const firstSavedMsg = storedUserMsgs[0];
      expect(firstSavedMsg.deanonymizations).to.have.length(1);
      expect(firstSavedMsg.deanonymizations[0].entity.value).to.eql('claudia@example.com');
      expect(firstSavedMsg.deanonymizations[0].entity.class_name).to.eql('EMAIL');

      // Second stored message
      const secSavedMsg = storedUserMsgs[1];
      expect(secSavedMsg.deanonymizations).to.have.length(1);
      expect(secSavedMsg.deanonymizations[0].entity.value).to.eql('http://claudia.is');
      expect(secSavedMsg.deanonymizations[0].entity.class_name).to.eql('URL');
    });
  });
}
