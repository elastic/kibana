/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import {
  createDistributedTraceWithErrors,
  type DistributedTraceData,
} from '../utils/synthtrace_scenarios/create_distributed_trace_with_errors';

const MOCKED_AI_SUMMARY = 'This is a mocked AI insight summary for the payment timeout error.';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');

  let llmProxy: LlmProxy;
  let connectorId: string;
  let apmSynthtraceEsClient: ApmSynthtraceEsClient;
  let traceData: DistributedTraceData;
  let llmRequestBody: any;

  describe('POST /internal/observability_agent_builder/ai_insights/error', function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    before(async () => {
      // Set up LLM proxy
      llmProxy = await createLlmProxy(log);
      connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

      // Create synthetic APM data with distributed trace and errors
      const result = await createDistributedTraceWithErrors({
        getService,
        environment: 'production',
      });
      apmSynthtraceEsClient = result.apmSynthtraceEsClient;
      traceData = result.traceData;

      // Mock LLM chat completion response
      llmProxy.interceptors.chatCompletion({
        name: 'error-ai-insight',
        response: {
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: MOCKED_AI_SUMMARY,
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      // Make the API call
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      await supertest
        .post('/internal/observability_agent_builder/ai_insights/error')
        .set('kbn-xsrf', 'true')
        .send({
          serviceName: 'payment-service',
          errorId: traceData.errorId,
          traceId: traceData.traceId,
          start: 'now-15m',
          end: 'now',
          environment: 'production',
          connectorId,
        })
        .expect(200);

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Capture the LLM request for assertions
      const llmRequest = llmProxy.interceptedRequests.find(
        (r) => r.matchingInterceptorName === 'error-ai-insight'
      );
      llmRequestBody = llmRequest?.requestBody;
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await deleteActionConnector(getService, { actionId: connectorId });
      llmProxy.close();
    });

    describe('LLM context verification', () => {
      it('sends a system prompt to the LLM', () => {
        const systemMessage = llmRequestBody.messages.find(
          (m: { role: string }) => m.role === 'system'
        );
        expect(systemMessage).to.be.ok();
        expect(systemMessage.content).to.contain('SRE Assistant');
      });

      it('sends user message with error context', () => {
        const userMessage = llmRequestBody.messages.find(
          (m: { role: string }) => m.role === 'user'
        );
        expect(userMessage).to.be.ok();
        expect(userMessage.content).to.contain('<ErrorContext>');
      });

      it('includes ErrorDetails in context', () => {
        const userMessage = llmRequestBody.messages.find(
          (m: { role: string }) => m.role === 'user'
        );
        expect(userMessage.content).to.contain('<ErrorDetails>');
        expect(userMessage.content).to.contain('PaymentTimeoutException');
        expect(userMessage.content).to.contain('Payment gateway timeout');
      });

      it('includes TraceDocuments with all services', () => {
        const userMessage = llmRequestBody.messages.find(
          (m: { role: string }) => m.role === 'user'
        );
        expect(userMessage.content).to.contain('<TraceDocuments>');

        // Verify all services from the distributed trace are present
        for (const service of traceData.services) {
          expect(userMessage.content).to.contain(service);
        }
      });

      it('includes TraceServices aggregation', () => {
        const userMessage = llmRequestBody.messages.find(
          (m: { role: string }) => m.role === 'user'
        );
        expect(userMessage.content).to.contain('<TraceServices>');
        expect(userMessage.content).to.contain('serviceName');
        expect(userMessage.content).to.contain('count');
        expect(userMessage.content).to.contain('errorCount');
      });

      it('includes transaction and span details in trace documents', () => {
        const userMessage = llmRequestBody.messages.find(
          (m: { role: string }) => m.role === 'user'
        );

        // Transaction names
        expect(userMessage.content).to.contain('POST /api/orders');
        expect(userMessage.content).to.contain('ProcessOrder');
        expect(userMessage.content).to.contain('ProcessPayment');

        // Span details
        expect(userMessage.content).to.contain('postgresql');
        expect(userMessage.content).to.contain('stripe.com');
      });
    });

    describe('API response', () => {
      it('returns the summary from the LLM', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');

        // Reset interceptor for this test
        llmProxy.interceptors.chatCompletion({
          name: 'error-ai-insight-response-test',
          response: {
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: MOCKED_AI_SUMMARY,
                },
                finish_reason: 'stop',
              },
            ],
          },
        });

        const response = await supertest
          .post('/internal/observability_agent_builder/ai_insights/error')
          .set('kbn-xsrf', 'true')
          .send({
            serviceName: 'payment-service',
            errorId: traceData.errorId,
            traceId: traceData.traceId,
            start: 'now-15m',
            end: 'now',
            environment: 'production',
            connectorId,
          })
          .expect(200);

        expect(response.body).to.have.property('summary');
        expect(response.body).to.have.property('context');
        expect(response.body.summary).to.contain(MOCKED_AI_SUMMARY);
      });
    });
  });
}
