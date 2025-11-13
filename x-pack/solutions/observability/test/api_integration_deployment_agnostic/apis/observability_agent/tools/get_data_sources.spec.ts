/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { isOtherResult } from '@kbn/onechat-common/tools';
import type { ToolResult, OtherResult } from '@kbn/onechat-common';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID } from '@kbn/observability-agent-plugin/server/tools';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-plugin/server/agent/register_observability_agent';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { setupToolCallThenAnswer } from '../utils/llm_proxy/scenarios';
import { createSyntheticLogsData, createSyntheticApmData } from '../utils/synthtrace_scenarios';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';

const LLM_EXPOSED_TOOL_NAME_FOR_GET_DATA_SOURCES = 'observability_get_data_sources';
const USER_PROMPT = 'Do I have any data sources? ';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe(`tool: ${OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID}`, function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    let llmProxy: LlmProxy;
    let connectorId: string;
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;

    describe('POST /api/agent_builder/converse', () => {
      let toolResponseContent: { results: ToolResult[] };
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let logsSynthtraceEsClient: LogsSynthtraceEsClient;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        agentBuilderApiClient = createAgentBuilderApiClient(scoped);

        ({ apmSynthtraceEsClient } = await createSyntheticApmData({ getService }));
        ({ logsSynthtraceEsClient } = await createSyntheticLogsData({ getService }));

        setupToolCallThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_DATA_SOURCES,
        });

        const body = await agentBuilderApiClient.converse({
          input: USER_PROMPT,
          connector_id: connectorId,
          agent_id: OBSERVABILITY_AGENT_ID,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        const responseMessage = body.response.message;
        expect(responseMessage).to.be('final');

        const handoverRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === 'handover-to-answer'
        )!.requestBody;

        const toolResponseMessage = handoverRequest.messages[handoverRequest.messages.length - 1]!;
        toolResponseContent = JSON.parse(toolResponseMessage.content as string) as {
          results: ToolResult[];
        };
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
        await deleteActionConnector(getService, { actionId: connectorId });

        llmProxy.close();
      });

      it('returns the correct tool results structure', () => {
        expect(toolResponseContent).to.have.property('results');
        expect(Array.isArray(toolResponseContent.results)).to.be(true);

        const toolResult = toolResponseContent.results[0] as OtherResult;
        expect(isOtherResult(toolResult)).to.be(true);

        const { data } = toolResult as OtherResult;
        expect(data).to.have.property('apm');
        expect(data).to.have.property('logs');
        expect(data).to.have.property('metrics');
        expect(data).to.have.property('alerts');
      });

      it('returns tool results with the relevant index patterns', () => {
        const toolResult = toolResponseContent.results[0] as OtherResult;
        const { data } = toolResult as OtherResult;

        const expectedIndexPatterns = {
          apm: {
            indexPatterns: {
              transaction: 'traces-apm*,apm-*,traces-*.otel-*',
              span: 'traces-apm*,apm-*,traces-*.otel-*',
              error: 'logs-apm*,apm-*,logs-*.otel-*',
              metric: 'metrics-apm*,apm-*,metrics-*.otel-*',
              onboarding: 'apm-*',
              sourcemap: 'apm-*',
            },
          },
          logs: {
            indexPatterns: ['logs-*-*', 'logs-*', 'filebeat-*'],
          },
          metrics: {
            indexPatterns: ['metrics-*'],
          },
          alerts: {
            indexPattern: ['alerts-observability-*'],
          },
        };

        expect(data).to.eql(expectedIndexPatterns);
      });
    });
  });
}
