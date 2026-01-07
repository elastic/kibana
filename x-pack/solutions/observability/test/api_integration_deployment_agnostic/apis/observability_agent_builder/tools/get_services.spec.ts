/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  generateServicesData,
  type ServiceConfig,
} from '@kbn/synthtrace';
import { isOtherResult } from '@kbn/onechat-common/tools';
import type { ToolResult, OtherResult } from '@kbn/onechat-common';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-builder-plugin/server/agent/register_observability_agent';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { setupToolCallThenAnswer } from '../utils/llm_proxy/scenarios';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';

const SERVICE_NAME = 'service-a';
const SERVICE_NAME_2 = 'service-b';
const SERVICE_NAME_3 = 'service-c';
const ENVIRONMENT = 'production';
const ENVIRONMENT_2 = 'staging';
const START = 'now-15m';
const END = 'now';

const LLM_EXPOSED_TOOL_NAME_FOR_GET_SERVICES = 'observability_get_services';
const USER_PROMPT = 'List my services in the last 15 minutes';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  let llmProxy: LlmProxy;
  let connectorId: string;
  let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;

  describe(`tool: ${OBSERVABILITY_GET_SERVICES_TOOL_ID}`, function () {
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

        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await apmSynthtraceEsClient.clean();

        const testServices: ServiceConfig[] = [
          {
            name: SERVICE_NAME,
            environment: ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 1, // 100% error rate to match original test
          },
          {
            name: SERVICE_NAME_2,
            environment: ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 1,
          },
        ];

        const range = timerange(START, END);
        const { client, generator } = generateServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: testServices,
        });

        await client.index(generator);

        setupToolCallThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_SERVICES,
          toolArg: {
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
        expect(data).to.have.property('services');
      });

      it('returns all available services for the given time range', () => {
        const toolResult = toolResponseContent.results[0] as OtherResult;
        const { data } = toolResult as OtherResult;
        const services = data.services as Array<Record<string, unknown>>;

        expect(Array.isArray(services)).to.be(true);
        expect(services.length).to.be(2);

        const hasServiceA = services.some((service) => service.serviceName === SERVICE_NAME);
        expect(hasServiceA).to.be(true);

        const hasServiceB = services.some((service) => service.serviceName === SERVICE_NAME_2);
        expect(hasServiceB).to.be(true);
      });

      describe('filtered by environment', () => {
        let nextToolResponseContent: { results: ToolResult[] };

        before(async () => {
          await apmSynthtraceEsClient.clean();

          const stagingServices: ServiceConfig[] = [
            {
              name: SERVICE_NAME_3,
              environment: ENVIRONMENT_2,
              agentName: 'nodejs',
              transactionName: 'GET /api',
              transactionType: 'request',
              duration: 50,
              errorRate: 1,
            },
          ];

          const range = timerange(START, END);
          const { client, generator } = generateServicesData({
            range,
            apmEsClient: apmSynthtraceEsClient,
            services: stagingServices,
          });

          await client.index(generator);

          setupToolCallThenAnswer({
            llmProxy,
            toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_SERVICES,
            toolArg: {
              serviceEnvironment: ENVIRONMENT_2,
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
          expect(body.response.message).to.be('final');

          const handoverRequests = llmProxy.interceptedRequests.filter(
            (r) => r.matchingInterceptorName === 'handover-to-answer'
          );
          const latestHandover = handoverRequests[handoverRequests.length - 1]!.requestBody;
          const toolResponseMessage = latestHandover.messages[latestHandover.messages.length - 1]!;
          nextToolResponseContent = JSON.parse(toolResponseMessage.content as string) as {
            results: ToolResult[];
          };
        });

        after(async () => {
          await apmSynthtraceEsClient.clean();
        });

        it('returns only services for the filtered environment', async () => {
          const toolResult = nextToolResponseContent.results[0] as OtherResult;
          const { data } = toolResult as OtherResult;
          const services = data.services as Array<Record<string, unknown>>;

          expect(Array.isArray(services)).to.be(true);
          expect(services.length).to.be(1);
          expect(services[0].serviceName).to.be(SERVICE_NAME_3);
        });
      });
    });
  });
}
