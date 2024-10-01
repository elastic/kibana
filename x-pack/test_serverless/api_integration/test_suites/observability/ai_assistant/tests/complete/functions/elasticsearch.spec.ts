/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { ELASTICSEARCH_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/elasticsearch';
import {
  LlmProxy,
  createLlmProxy,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/common/create_llm_proxy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getMessageAddedEvents, invokeChatCompleteWithFunctionRequest } from './helpers';
import {
  createProxyActionConnector,
  deleteActionConnector,
} from '../../../common/action_connectors';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const synthtrace = getService('synthtrace');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  describe('when calling elasticsearch', function () {
    // TODO: https://github.com/elastic/kibana/issues/192751
    this.tags(['skipMKI']);
    let proxy: LlmProxy;
    let connectorId: string;
    let events: MessageAddEvent[];
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      apmSynthtraceEsClient = await synthtrace.createSynthtraceEsClient();
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector({
        supertest,
        log,
        port: proxy.getPort(),
        roleAuthc,
        internalReqHeader,
      });

      // intercept the LLM request and return a fixed response
      void proxy
        .intercept('conversation', () => true, 'Hello from LLM Proxy')
        .completeAfterIntercept();

      await generateApmData(apmSynthtraceEsClient);

      const responseBody = await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        internalReqHeader,
        roleAuthc,
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

      await proxy.waitForAllInterceptorsSettled();

      events = getMessageAddedEvents(responseBody);
    });

    after(async () => {
      proxy.close();
      await deleteActionConnector({ supertest, connectorId, log, roleAuthc, internalReqHeader });
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
