/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { aiAnonymizationSettings } from '@kbn/inference-common';
import type { LlmProxy, LlmResponseSimulator } from '../utils/create_llm_proxy';
import { createLlmProxy } from '../utils/create_llm_proxy';
import { setAdvancedSettings } from '../utils/advanced_settings';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { clearConversations } from '../utils/conversation';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  let proxy: LlmProxy;
  let connectorId: string;

  const conversationsIndex = '.kibana-observability-ai-assistant-conversations-000001';
  let simulatorPromise: Promise<LlmResponseSimulator>;
  let simulator: LlmResponseSimulator;

  describe('anonymization', function () {
    const userText1 = 'My name is Claudia and my email is claudia@example.com';
    const userText2 = 'my website is http://claudia.is';
    // LLM proxy is not working on MKI
    this.tags(['skipCloud']);
    before(async () => {
      await clearConversations(es);
      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      // configure anonymization rules for these tests
      await setAdvancedSettings(kibanaServer, {
        [aiAnonymizationSettings]: JSON.stringify(
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

      simulatorPromise = proxy.interceptWithResponse(
        'your email is EMAIL_f3cad5d12e6341ea1f5c27832754720aff68020e'
      );

      void proxy.interceptTitle('Title for a new conversation');

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
      simulator = await simulatorPromise;
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({ actionId: connectorId });
      await clearConversations(es);
      await setAdvancedSettings(kibanaServer, {
        [aiAnonymizationSettings]: JSON.stringify({ rules: [] }),
      });
    });

    it('does not send detected entities to the LLM via chat/complete', async () => {
      const userMsgsReq = simulator.requestBody.messages.filter((m: any) => m.role === 'user');
      // Consecutive user messages are merged into a single message with array content
      expect(userMsgsReq).to.have.length(1);
      const contentParts = userMsgsReq[0].content!;
      expect(contentParts).to.be.an('array');
      expect(contentParts).to.have.length(2);
      // First content part (email anonymized)
      const firstPart = (contentParts[0] as { text: string }).text;
      expect(firstPart).to.not.contain('claudia@example.com');
      expect((firstPart.match(/[0-9a-f]{40}/g) || []).length).to.be(1);
      // Second content part (URL anonymized)
      const secPart = (contentParts[1] as { text: string }).text;
      expect(secPart).to.not.contain('http://claudia.is');
      expect((secPart.match(/[0-9a-f]{40}/g) || []).length).to.be(1);
    });

    it('stores deanonymized messages and deanonymizations in Elasticsearch', async () => {
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

      // First stored user message
      const firstSavedMsg = storedUserMsgs[0];
      expect(firstSavedMsg.deanonymizations).to.have.length(1);
      expect(firstSavedMsg.deanonymizations[0].entity.value).to.eql('claudia@example.com');
      expect(firstSavedMsg.deanonymizations[0].entity.class_name).to.eql('EMAIL');

      // Second stored user message
      const secSavedMsg = storedUserMsgs[1];
      expect(secSavedMsg.deanonymizations).to.have.length(1);
      expect(secSavedMsg.deanonymizations[0].entity.value).to.eql('http://claudia.is');
      expect(secSavedMsg.deanonymizations[0].entity.class_name).to.eql('URL');

      // stores assistant message
      const storedAssistantMsg = hit.messages.find(
        (m: any) => m.message.role === 'assistant' && m.message.content?.includes('your email')
      )?.message;

      expect(storedAssistantMsg).to.be.ok();
      // Should contain clear text, not the hashed mask
      expect(storedAssistantMsg.content).to.contain('claudia@example.com');
      expect(storedAssistantMsg.content).to.not.match(/[0-9a-f]{40}/);

      // Should have deanonymizations array with the detected entity
      expect(storedAssistantMsg.deanonymizations).to.be.an('array');
      expect(storedAssistantMsg.deanonymizations).to.have.length(1);
      expect(storedAssistantMsg.deanonymizations[0].entity.value).to.eql('claudia@example.com');
      expect(storedAssistantMsg.deanonymizations[0].entity.class_name).to.eql('EMAIL');
    });
  });
}
