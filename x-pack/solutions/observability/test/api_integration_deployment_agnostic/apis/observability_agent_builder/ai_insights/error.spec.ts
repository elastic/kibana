/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  setupLlmProxy,
  teardownLlmProxy,
  getLlmMessages,
  type LlmMessage,
} from '../utils/llm_proxy/llm_test_helpers';
import {
  createDistributedTraceWithErrors,
  type DistributedTraceData,
} from '../utils/synthtrace_scenarios/ai_insights/create_distributed_trace_with_errors';

const MOCKED_AI_SUMMARY = 'This is a mocked AI insight summary for the payment timeout error.';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAgentBuilderApi = getService('observabilityAgentBuilderApi');

  describe('AI Insights: Error', function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    describe('POST /internal/observability_agent_builder/ai_insights/error', function () {
      let llmProxy: LlmProxy;
      let connectorId: string;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let logsSynthtraceEsClient: LogsSynthtraceEsClient;
      let traceData: DistributedTraceData;
      let systemMessage: LlmMessage;
      let userMessage: LlmMessage;
      let apiResponse: { summary: string; context: string };

      before(async () => {
        ({ llmProxy, connectorId } = await setupLlmProxy(getService));

        ({ apmSynthtraceEsClient, logsSynthtraceEsClient, traceData } =
          await createDistributedTraceWithErrors({
            getService,
            environment: 'production',
          }));

        void llmProxy.interceptors.userMessage({
          name: 'error-ai-insight',
          response: MOCKED_AI_SUMMARY,
        });

        const { body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/error',
          params: {
            body: {
              serviceName: traceData.serviceName,
              errorId: traceData.errorId,
              start: 'now-24h',
              end: 'now',
              environment: 'production',
            },
          },
        });

        apiResponse = body;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const messages = getLlmMessages(llmProxy, 'error-ai-insight');
        systemMessage = messages.system;
        userMessage = messages.user;
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
        await teardownLlmProxy(getService, { llmProxy, connectorId });
      });

      describe('LLM context', () => {
        it('sends a system prompt to the LLM', () => {
          expect(systemMessage).to.be.an('object');
          expect(systemMessage.content).to.contain('SRE Assistant');
        });

        it('sends user message with error context', () => {
          expect(userMessage).to.be.an('object');
          expect(userMessage.content).to.contain('<ErrorContext>');
        });

        it('includes ErrorDetails in context', () => {
          expect(userMessage.content).to.contain('<ErrorDetails>');
          expect(userMessage.content).to.contain(traceData.errorType);
          expect(userMessage.content).to.contain(traceData.errorMessage);
          expect(userMessage.content).to.contain(traceData.traceId);
          expect(userMessage.content).to.contain(traceData.serviceName);
        });

        it('includes DownstreamDependencies for the erroring service', () => {
          expect(userMessage.content).to.contain('<DownstreamDependencies>');
          expect(userMessage.content).to.contain('postgresql');
          expect(userMessage.content).to.contain('stripe.com');
        });

        it('includes TraceDocuments with transaction and span details', () => {
          expect(userMessage.content).to.contain('<TraceDocuments>');

          // Transaction names from the distributed trace
          expect(userMessage.content).to.contain('POST /api/orders');
          expect(userMessage.content).to.contain('ProcessOrder');
          expect(userMessage.content).to.contain('ProcessPayment');
          expect(userMessage.content).to.contain('CheckInventory');

          // Span details
          expect(userMessage.content).to.contain('postgresql');
          expect(userMessage.content).to.contain('stripe.com');
        });

        it('includes TraceServices aggregation with all services', () => {
          expect(userMessage.content).to.contain('<TraceServices>');
          expect(userMessage.content).to.contain('serviceName');
          expect(userMessage.content).to.contain('count');
          expect(userMessage.content).to.contain('errorCount');

          // Verify all services from the distributed trace are present
          for (const service of traceData.services) {
            expect(userMessage.content).to.contain(service);
          }
        });
      });

      describe('API response', () => {
        it('returns the summary from the LLM', () => {
          expect(apiResponse).to.have.property('summary');
          expect(apiResponse.summary).to.contain(MOCKED_AI_SUMMARY);
        });

        it('returns the context', () => {
          expect(apiResponse).to.have.property('context');
          expect(apiResponse.context).to.be.a('string');
        });
      });
    });
  });
}
