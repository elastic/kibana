/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  setupLlmProxy,
  teardownLlmProxy,
  getLlmMessages,
} from '../utils/llm_proxy/llm_test_helpers';
import {
  createLogsWithErrors,
  type LogData,
} from '../utils/synthtrace_scenarios/ai_insights/create_logs_with_errors';

const MOCKED_AI_SUMMARY_ERROR = 'This is a mocked AI insight summary for the error log.';
const MOCKED_AI_SUMMARY_INFO = 'This is a mocked AI insight summary for the info log.';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
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

      const serviceName = 'payment-service';

      before(async () => {
        ({ llmProxy, connectorId } = await setupLlmProxy(getService));

        ({ logsSynthtraceEsClient, logData } = await createLogsWithErrors({
          getService,
          serviceName,
          environment: 'production',
        }));

        const findLogByLevel = async (logLevel: string) => {
          const response = await es.search({
            index: 'logs-*',
            query: {
              bool: {
                must: [
                  { term: { 'service.name': serviceName } },
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
        await logsSynthtraceEsClient?.clean();
        await teardownLlmProxy(getService, { llmProxy, connectorId });
      });

      const testCases = [
        {
          name: 'error',
          getLogId: () => errorLogId,
          getLogIndex: () => errorLogIndex,
          mockedSummary: MOCKED_AI_SUMMARY_ERROR,
          expectedContextTags: ['<CorrelatedLogSequence>'],
        },
        {
          name: 'info',
          getLogId: () => infoLogId,
          getLogIndex: () => infoLogIndex,
          mockedSummary: MOCKED_AI_SUMMARY_INFO,
          expectedContextTags: ['<CorrelatedLogSequence>'],
        },
      ];

      for (const testCase of testCases) {
        it(`returns summary and context for ${testCase.name} log with additional context`, async () => {
          llmProxy.clear();

          const interceptorName = `${testCase.name}-log-ai-insight`;
          void llmProxy.interceptors.userMessage({
            name: interceptorName,
            response: testCase.mockedSummary,
          });

          const { status, body } = await observabilityAgentBuilderApi.editor({
            endpoint: 'POST /internal/observability_agent_builder/ai_insights/log',
            params: {
              body: {
                index: testCase.getLogIndex(),
                id: testCase.getLogId(),
              },
            },
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(status).to.be(200);
          expect(body).to.have.property('summary');
          expect(body).to.have.property('context');
          expect(body.summary).to.contain(testCase.mockedSummary);

          const { user: userMessage } = getLlmMessages(llmProxy, interceptorName);
          for (const tag of testCase.expectedContextTags) {
            expect(userMessage.content).to.contain(tag);
          }
        });
      }
    });
  });
}
