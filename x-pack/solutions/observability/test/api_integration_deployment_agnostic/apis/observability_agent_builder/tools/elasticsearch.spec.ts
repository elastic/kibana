/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { createToolCallMessage } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { OBSERVABILITY_ELASTICSEARCH_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { setupLlmProxy, teardownLlmProxy } from '../utils/llm_proxy/llm_test_helpers';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe(`tool: ${OBSERVABILITY_ELASTICSEARCH_TOOL_ID}`, function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
    });

    describe('POST kbn://api/agent_builder/tools/_execute', () => {
      describe('when OpenAPI spec documentation is not installed', () => {
        let llmProxy: LlmProxy;
        let connectorId: string;

        before(async () => {
          ({ llmProxy, connectorId } = await setupLlmProxy(getService));
        });

        after(async () => {
          await teardownLlmProxy(getService, { llmProxy, connectorId });
        });

        it('returns an error indicating OpenAPI documentation is not installed', async () => {
          const results = await agentBuilderApiClient.executeTool({
            id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
            params: { nlQuery: 'get cluster health' },
          });

          expect(results).to.have.length(1);
          expect(results[0].type).to.be('error');
          const errorData = results[0].data as {
            message: string;
            metadata?: { settingsUrl: string };
          };
          expect(errorData.message).to.contain('OpenAPI spec documentation is not installed');
          expect(errorData.metadata).to.have.property('settingsUrl');
          expect(errorData.metadata!.settingsUrl).to.be('/app/management/ai/genAiSettings');
        });
      });
    });

    describe('POST kbn://api/agent_builder/converse', () => {
      describe('when OpenAPI spec documentation is not installed', () => {
        let llmProxy: LlmProxy;
        let connectorId: string;

        before(async () => {
          ({ llmProxy, connectorId } = await setupLlmProxy(getService));
        });

        after(async () => {
          await teardownLlmProxy(getService, { llmProxy, connectorId });
        });

        it('returns a tool call step for the elasticsearch tool', async () => {
          void llmProxy.interceptors.userMessage({
            name: 'agent-call-elasticsearch-tool',
            when: ({ messages }) => {
              const systemMessage = messages.find((message) => message.role === 'system');
              const systemText = String(systemMessage?.content ?? '');
              return !systemText.includes('You are a title-generation utility');
            },
            response: createToolCallMessage(OBSERVABILITY_ELASTICSEARCH_TOOL_ID, {
              nlQuery: 'get cluster health',
            }),
          });

          void llmProxy
            .intercept({
              name: 'set_title',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                const systemText = String(systemMessage?.content ?? '');
                return systemText.includes('You are a title-generation utility');
              },
              responseMock: createToolCallMessage('set_title', {
                title: 'Elasticsearch cluster health',
              }),
            })
            .completeAfterIntercept();

          // After tool execution, the agent builder pipeline makes an internal LLM call
          // to summarize tool results into a handover note for the answering agent.
          void llmProxy
            .intercept({
              name: 'handover-to-answer',
              when: ({ messages }) => {
                const systemMessage = messages.find((message) => message.role === 'system');
                return (systemMessage?.content as string).includes(
                  'This response will serve as a handover note for the answering agent'
                );
              },
              responseMock: 'ready to answer',
            })
            .completeAfterIntercept();

          void llmProxy
            .intercept({
              name: 'final-assistant-response',
              when: () => true,
              responseMock:
                'The Elasticsearch documentation is not installed. Please install it from the GenAI Settings page.',
            })
            .completeAfterIntercept();

          const response = await agentBuilderApiClient.converse({
            input: 'Check the cluster health using Elasticsearch API',
            agent_id: 'observability.agent',
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
          expect(response.response.message).to.be(
            'The Elasticsearch documentation is not installed. Please install it from the GenAI Settings page.'
          );
        });
      });
    });
  });
}
