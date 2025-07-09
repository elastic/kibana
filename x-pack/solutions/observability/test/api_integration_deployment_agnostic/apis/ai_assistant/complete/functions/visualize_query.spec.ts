/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { LlmProxy, createLlmProxy } from '../../utils/create_llm_proxy';
import {
  getMessageAddedEvents,
  invokeChatCompleteWithFunctionRequest,
} from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('tool: visualize_query', function () {
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;
    let events: MessageAddEvent[];
    const query = `FROM test_index`;

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
      void llmProxy.interceptWithResponse('Hello from LLM Proxy');
      const responseBody = await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'visualize_query',
          trigger: MessageRole.Assistant,
          arguments: JSON.stringify({
            query,
            intention: VisualizeESQLUserIntention.visualizeAuto,
          }),
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
      const functionResponse = events[0];
      expect(functionResponse.message.message.name).to.be('visualize_query');

      const parsedResponse = JSON.parse(functionResponse.message.message.content!);
      expect(parsedResponse.message).to.contain(query);
    });

    it('should contain expected document data in response', async () => {
      const functionResponse = events[0];
      const parsedData = JSON.parse(functionResponse.message.message.data!);

      expect(parsedData.columns[0].id).to.be('bar');
      expect(parsedData.rows[0][0]).to.be('foo');
      expect(parsedData).to.have.property('correctedQuery', query);
    });
  });
}
