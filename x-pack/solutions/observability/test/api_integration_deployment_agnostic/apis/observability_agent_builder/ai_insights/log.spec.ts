/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import {
  createLogsWithErrors,
  type LogData,
} from '../utils/synthtrace_scenarios/ai_insights/create_logs_with_errors';

const MOCKED_AI_SUMMARY_ERROR = 'This is a mocked AI insight summary for the error log.';
const MOCKED_AI_SUMMARY_INFO = 'This is a mocked AI insight summary for the info log.';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAgentBuilderApi = getService('observabilityAgentBuilderApi');
  const es = getService('es');

  describe('AI Insights: Log', function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    describe('POST /internal/observability_agent_builder/ai_insights/log', function () {
      let llmProxy: LlmProxy;
      let connectorId: string;
      let logsSynthtraceEsClient: LogsSynthtraceEsClient;
      let logData: LogData;
      let errorLogIndex: string;
      let infoLogIndex: string;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

        ({ logsSynthtraceEsClient, logData } = await createLogsWithErrors({
          getService,
          environment: 'production',
        }));

        const errorLogResponse = await es.search({
          index: 'logs-*',
          query: {
            bool: {
              must: [
                { term: { 'service.name': logData.serviceName } },
                { term: { 'trace.id': logData.traceId } },
                { term: { 'log.level': 'error' } },
              ],
            },
          },
          size: 1,
        });
        const errorLogDoc = errorLogResponse.hits.hits[0];
        if (!errorLogDoc) {
          throw new Error('Error log not found');
        }
        errorLogIndex = errorLogDoc._index as string;
        logData.errorLogId = errorLogDoc._id as string;

        const infoLogResponse = await es.search({
          index: 'logs-*',
          query: {
            bool: {
              must: [
                { term: { 'service.name': logData.serviceName } },
                { term: { 'trace.id': logData.traceId } },
                { term: { 'log.level': 'info' } },
              ],
            },
          },
          size: 1,
        });
        const infoLogDoc = infoLogResponse.hits.hits[0];
        if (!infoLogDoc) {
          throw new Error('Info log not found');
        }
        infoLogIndex = infoLogDoc._index as string;
        logData.infoLogId = infoLogDoc._id as string;
      });

      after(async () => {
        if (logsSynthtraceEsClient) {
          await logsSynthtraceEsClient.clean();
        }
        if (connectorId) {
          await deleteActionConnector(getService, { actionId: connectorId });
        }
        if (llmProxy) {
          llmProxy.close();
        }
      });

      it('returns summary and context for error log with CorrelatedLogSequence', async () => {
        void llmProxy.interceptors.userMessage({
          name: 'error-log-ai-insight',
          response: MOCKED_AI_SUMMARY_ERROR,
        });

        const { status, body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/log',
          params: {
            body: {
              index: errorLogIndex,
              id: logData.errorLogId,
            },
          },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(status).to.be(200);
        expect(body).to.have.property('summary');
        expect(body).to.have.property('context');
        expect(body.summary).to.contain(MOCKED_AI_SUMMARY_ERROR);

        const llmRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === 'error-log-ai-insight'
        );
        const userMessage = llmRequest?.requestBody?.messages?.find(
          (m: { role: string }) => m.role === 'user'
        );
        expect(userMessage.content).to.contain('<CorrelatedLogSequence>');
        expect(userMessage.content).to.contain(logData.traceId);
      });

      it('returns summary and context for info log with ServiceSummary', async () => {
        llmProxy.clear();

        void llmProxy.interceptors.userMessage({
          name: 'info-log-ai-insight',
          response: MOCKED_AI_SUMMARY_INFO,
        });

        const { status, body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/log',
          params: {
            body: {
              index: infoLogIndex,
              id: logData.infoLogId,
            },
          },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(status).to.be(200);
        expect(body).to.have.property('summary');
        expect(body).to.have.property('context');
        expect(body.summary).to.contain(MOCKED_AI_SUMMARY_INFO);

        const llmRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === 'info-log-ai-insight'
        );
        const userMessage = llmRequest?.requestBody?.messages?.find(
          (m: { role: string }) => m.role === 'user'
        );
        expect(userMessage.content).to.contain('<ServiceSummary>');
        expect(userMessage.content).to.not.contain('<CorrelatedLogSequence>');
      });
    });
  });
}
