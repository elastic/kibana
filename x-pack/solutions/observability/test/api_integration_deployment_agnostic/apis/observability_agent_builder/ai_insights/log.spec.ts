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
      let errorLogId: string;
      let errorLogIndex: string;
      let infoLogId: string;
      let infoLogIndex: string;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

        ({ logsSynthtraceEsClient, logData } = await createLogsWithErrors({
          getService,
          environment: 'production',
        }));

        const findLogByLevel = async (logLevel: string) => {
          const response = await es.search({
            index: 'logs-*',
            query: {
              bool: {
                must: [
                  { term: { 'service.name': logData.serviceName } },
                  { term: { 'trace.id': logData.traceId } },
                  { term: { 'log.level': logLevel } },
                ],
              },
            },
            size: 1,
          });
          const doc = response.hits.hits[0];
          if (!doc) {
            throw new Error(`${logLevel} log not found`);
          }
          return { id: doc._id as string, index: doc._index as string };
        };

        ({ id: errorLogId, index: errorLogIndex } = await findLogByLevel('error'));
        ({ id: infoLogId, index: infoLogIndex } = await findLogByLevel('info'));
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

      it('returns summary and context for error log with additional context', async () => {
        void llmProxy.interceptors.userMessage({
          name: 'error-log-ai-insight',
          response: MOCKED_AI_SUMMARY_ERROR,
        });

        const { status, body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/log',
          params: {
            body: {
              index: errorLogIndex,
              id: errorLogId,
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

        const hasCorrelatedLogs = userMessage?.content?.includes('<CorrelatedLogSequence>');
        const hasLogCategories = userMessage?.content?.includes('<LogCategories>');
        expect(hasCorrelatedLogs || hasLogCategories).to.be(true);
      });

      it('returns summary and context for info log with additional context', async () => {
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
              id: infoLogId,
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

        const hasCorrelatedLogs = userMessage?.content?.includes('<CorrelatedLogSequence>');
        const hasLogCategories = userMessage?.content?.includes('<LogCategories>');
        expect(hasCorrelatedLogs || hasLogCategories).to.be(true);
      });
    });
  });
}
