/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MessageAddEvent,
  MessageRole,
  StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common';
import { ToolingLog } from '@kbn/tooling-log';
import { Agent } from 'supertest';
import expect from '@kbn/expect';
import { Readable } from 'stream';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { ELASTICSEARCH_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/elasticsearch';
import { createLlmProxy, LlmProxy } from '../../../common/create_llm_proxy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('when calling elasticsearch', () => {
    let proxy: LlmProxy;
    let connectorId: string;
    let events: MessageAddEvent[];

    before(async () => {
      ({ connectorId, proxy } = await createLLMProxyConnector({ log, supertest }));
      await generateApmData(apmSynthtraceEsClient);

      const res = await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.Assistant,
                    content: '',
                    function_call: {
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
                  },
                },
              ],
              connectorId,
              persist: false,
              screenContexts: [],
            },
          },
        })
        .expect(200);

      events = getMessageAddedEvents(res.body);
    });

    after(async () => {
      await deleteLLMProxyConnector({ supertest, connectorId, proxy });
      await apmSynthtraceEsClient.clean();
    });

    it('returns elasticsearch function response', async () => {
      await proxy.waitForAllInterceptorsSettled();

      const esFunctionResponse = events[0];
      const parsedEsResponse = JSON.parse(esFunctionResponse.message.message.content!).response;

      expect(esFunctionResponse.message.message.name).to.be('elasticsearch');
      expect(parsedEsResponse.hits.total.value).to.be(15);
      expect(parsedEsResponse.aggregations.services.buckets).to.eql([
        { key: 'foo', doc_count: 15 },
      ]);
      expect(events.length).to.be(2);
    });
  });
}

function decodeEvents(body: Readable | string) {
  return String(body)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamingChatResponseEvent);
}

function getMessageAddedEvents(body: Readable | string) {
  return decodeEvents(body).filter(
    (event): event is MessageAddEvent => event.type === 'messageAdd'
  );
}

async function createLLMProxyConnector({ log, supertest }: { log: ToolingLog; supertest: Agent }) {
  const proxy = await createLlmProxy(log);

  // intercept the LLM request and return a fixed response
  proxy.intercept('conversation', () => true, 'Hello from LLM Proxy').completeAfterIntercept();

  const response = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'OpenAI Proxy',
      connector_type_id: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
      },
      secrets: {
        apiKey: 'my-api-key',
      },
    })
    .expect(200);

  return {
    proxy,
    connectorId: response.body.id,
  };
}

async function deleteLLMProxyConnector({
  supertest,
  connectorId,
  proxy,
}: {
  supertest: Agent;
  connectorId: string;
  proxy: LlmProxy;
}) {
  await supertest
    .delete(`/api/actions/connector/${connectorId}`)
    .set('kbn-xsrf', 'foo')
    .expect(204);

  proxy.close();
}

async function generateApmData(apmSynthtraceEsClient: ApmSynthtraceEsClient) {
  const serviceA = apm
    .service({ name: 'foo', environment: 'production', agentName: 'java' })
    .instance('a');

  const events = timerange('now-15m', 'now')
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return serviceA.transaction({ transactionName: 'tx' }).timestamp(timestamp).duration(1000);
    });

  return apmSynthtraceEsClient.index(events);
}
