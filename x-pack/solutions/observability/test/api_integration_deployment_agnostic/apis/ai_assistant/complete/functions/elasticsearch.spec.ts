/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import {
  ELASTICSEARCH_FUNCTION_NAME,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '../../utils/create_llm_proxy';
import { createLlmProxy } from '../../utils/create_llm_proxy';
import {
  getMessageAddedEvents,
  invokeChatCompleteWithFunctionRequest,
} from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const synthtrace = getService('synthtrace');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('tool: elasticsearch', function () {
    // LLM Proxy is not yet support in MKI: https://github.com/elastic/obs-ai-assistant-team/issues/199
    this.tags(['skipCloud']);
    let proxy: LlmProxy;
    let connectorId: string;
    let events: MessageAddEvent[];
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      proxy = await createLlmProxy(log);
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      // intercept the LLM request and return a fixed response
      void proxy.interceptWithResponse('Hello from LLM Proxy');

      await generateApmData(apmSynthtraceEsClient);

      const responseBody = await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: ELASTICSEARCH_FUNCTION_NAME,
          trigger: MessageRole.User,
          arguments: JSON.stringify({
            method: 'POST',
            path: 'traces*/_search',
            body: {
              size: 0,
              aggs: {
                services: {
                  terms: {
                    field: 'service.name',
                  },
                },
              },
            },
          }),
        },
      });

      await proxy.waitForAllInterceptorsToHaveBeenCalled();

      events = getMessageAddedEvents(responseBody);
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
      await apmSynthtraceEsClient.clean();
    });

    it('returns elasticsearch function response', async () => {
      const esFunctionResponse = events[0];
      const parsedEsResponse = JSON.parse(esFunctionResponse.message.message.content!).response;

      expect(esFunctionResponse.message.message.name).to.be('elasticsearch');
      expect(parsedEsResponse.hits.total.value).to.be(15);
      expect(parsedEsResponse.aggregations.services.buckets).to.eql([
        { key: 'java-backend', doc_count: 15 },
      ]);
      expect(events.length).to.be(2);
    });
  });
}

export async function generateApmData(apmSynthtraceEsClient: ApmSynthtraceEsClient) {
  const serviceA = apm
    .service({ name: 'java-backend', environment: 'production', agentName: 'java' })
    .instance('a');

  const events = timerange('now-15m', 'now')
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return serviceA.transaction({ transactionName: 'tx' }).timestamp(timestamp).duration(1000);
    });

  return apmSynthtraceEsClient.index(events);
}
