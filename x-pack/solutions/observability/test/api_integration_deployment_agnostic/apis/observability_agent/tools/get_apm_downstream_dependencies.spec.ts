/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { isOtherResult } from '@kbn/onechat-common/tools';
import type { ToolResult, OtherResult } from '@kbn/onechat-common';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-plugin/server/agent/register_observability_agent';
import { OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID } from '@kbn/apm-plugin/common/observability_agent/agent_tool_ids';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { setupToolCallThenAnswer } from '../utils/llm_proxy/scenarios';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import { createSyntheticApmDataWithDependency } from '../utils/synthtrace_scenarios';

const SERVICE_NAME = 'service-a';
const ENVIRONMENT = 'production';
const START = 'now-15m';
const END = 'now';
const DEPENDENCY_RESOURCE = 'elasticsearch/my-backend';

const LLM_EXPOSED_TOOL_NAME_FOR_GET_APM_DOWNSTREAM_DEPENDENCIES =
  'observability_get_apm_downstream_dependencies';
const USER_PROMPT = `What are the downstream dependencies for the service ${SERVICE_NAME} in the last 15 minutes?`;

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');

  let llmProxy: LlmProxy;
  let connectorId: string;
  let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;

  describe(`tool: ${OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID}`, function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    describe('POST /api/agent_builder/converse', () => {
      let toolResponseContent: { results: ToolResult[] };
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        agentBuilderApiClient = createAgentBuilderApiClient(scoped);

        ({ apmSynthtraceEsClient } = await createSyntheticApmDataWithDependency({
          getService,
          serviceName: SERVICE_NAME,
          environment: ENVIRONMENT,
          dependencyResource: DEPENDENCY_RESOURCE,
        }));

        setupToolCallThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_APM_DOWNSTREAM_DEPENDENCIES,
          toolArg: {
            serviceName: SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
          },
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
        await deleteActionConnector(getService, { actionId: connectorId });
        llmProxy.close();
      });

      it('returns the correct tool results structure', () => {
        expect(toolResponseContent).to.have.property('results');
        expect(Array.isArray(toolResponseContent.results)).to.be(true);

        const toolResult = toolResponseContent.results[0] as OtherResult;
        expect(isOtherResult(toolResult)).to.be(true);

        const { data } = toolResult as OtherResult;
        expect(data).to.have.property('dependencies');
      });

      it('returns downstream dependencies for the given service and time range', () => {
        const toolResult = toolResponseContent.results[0] as OtherResult;
        const { data } = toolResult as OtherResult;
        const dependencies = data.dependencies as Array<Record<string, unknown>>;

        expect(Array.isArray(dependencies)).to.be(true);
        expect(dependencies.length > 0).to.be(true);

        const hasExpectedBackend = dependencies.some(
          (d) =>
            d['span.destination.service.resource'] === DEPENDENCY_RESOURCE &&
            d['span.type'] === 'db' &&
            d['span.subtype'] === 'elasticsearch'
        );

        expect(hasExpectedBackend).to.be(true);
      });
    });
  });
}
