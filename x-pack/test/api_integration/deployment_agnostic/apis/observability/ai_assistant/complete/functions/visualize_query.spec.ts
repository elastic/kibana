/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import {
  getMessageAddedEvents,
  invokeChatCompleteWithFunctionRequest,
} from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('visualize_query', function () {
    this.tags(['failsOnMKI']);
    let llmProxy: LlmProxy;
    let connectorId: string;
    let events: MessageAddEvent[];

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });
      await es.index({
        index: 'test_index',
        refresh: true,
        id: 'index_id',
        document: { bar: 'foo' },
      });
      void llmProxy.interceptConversation('Hello from LLM Proxy');
      const responseBody = await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'visualize_query',
          trigger: MessageRole.Assistant,
          arguments: JSON.stringify({ query: 'FROM test_index', intention: 'visualizeAuto' }),
        },
      });

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      events = getMessageAddedEvents(responseBody);
    });

    after(async () => {
      await es.indices.delete({
        index: 'test_index',
      });
      llmProxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
    });

    it('should execute the visualize_query function and return expected messages', async () => {
      expect(events.length).to.be(2);
    });

    it('should correctly structure the function response', async () => {
      const functionResponse = events[0];
      expect(functionResponse.message.message.name).to.be('visualize_query');

      const parsedResponse = JSON.parse(functionResponse.message.message.content!);
      expect(parsedResponse.message).to.contain('Only following query is visualized');
      expect(parsedResponse.errorMessages).to.be.an('array');
      expect(parsedResponse.errorMessages.length).to.be(0);
    });

    it('should contain expected data structure in response', async () => {
      const functionResponse = events[0];
      const parsedData = JSON.parse(functionResponse.message.message.data!);

      expect(parsedData).to.have.property('columns');
      expect(parsedData).to.have.property('rows');
      expect(parsedData).to.have.property('correctedQuery', 'FROM test_index');
    });

    it('should return a valid LLM proxy response', async () => {
      const llmResponse = events[1];
      expect(llmResponse.message.message.content).to.be('Hello from LLM Proxy');
      expect(llmResponse.message.message.role).to.be('assistant');
    });
  });
}
