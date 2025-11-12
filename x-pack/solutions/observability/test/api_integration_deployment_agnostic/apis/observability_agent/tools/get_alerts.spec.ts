/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { ToolResult, OtherResult } from '@kbn/onechat-common';
import { isOtherResult } from '@kbn/onechat-common/tools';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-plugin/server/agent/register_observability_agent';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '@kbn/observability-agent-plugin/server/tools';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { APM_ALERTS_INDEX } from '../../apm/alerts/helpers/alerting_helper';
import type { AgentBuilderApiClient } from '../utils/agent_builder_client';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import { setupToolCallThenAnswer } from '../utils/llm_proxy/scenarios';
import { createSyntheticApmData } from '../utils/synthtrace_scenarios';
import { createRule, deleteRules } from '../../ai_assistant/utils/alerts';

const LLM_EXPOSED_TOOL_NAME_FOR_GET_ALERTS = 'observability_get_alerts';
const USER_PROMPT = 'Summarize active alerts over the last 4 hours';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const samlAuth = getService('samlAuth');
  const alertingApi = getService('alertingApi');
  const kibanaServer = getService('kibanaServer');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe(`tool: ${OBSERVABILITY_GET_ALERTS_TOOL_ID}`, function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    describe('POST /api/agent_builder/converse', () => {
      let llmProxy: LlmProxy;
      let connectorId: string;
      let agentBuilderApiClient: AgentBuilderApiClient;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let roleAuthc: RoleCredentials;
      let internalReqHeader: InternalRequestHeader;
      let createdRuleId: string;

      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        internalReqHeader = samlAuth.getInternalRequestHeader();
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

        ({ apmSynthtraceEsClient } = await createSyntheticApmData({ getService }));

        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        agentBuilderApiClient = createAgentBuilderApiClient(scoped);

        createdRuleId = await createRule({
          getService,
          roleAuthc,
          internalReqHeader,
          data: {
            ruleTypeId: ApmRuleType.TransactionErrorRate,
            indexName: APM_ALERTS_INDEX,
            consumer: 'apm',
            environment: 'production',
            threshold: 1,
            windowSize: 1,
            windowUnit: 'h',
            ruleName: 'Recent Alert',
            docCountTarget: 1,
          },
        });

        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        await es.index({
          index: '.internal.alerts-observability.apm.alerts-default-000001',
          refresh: 'wait_for',
          document: {
            '@timestamp': new Date().toISOString(),
            'kibana.alert.start': eightDaysAgo,
            'kibana.alert.status': 'active',
            'kibana.alert.rule.name': 'Manually Indexed Old Alert',
            'kibana.alert.rule.consumer': 'apm',
            'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
            'kibana.alert.evaluation.threshold': 1,
            'service.environment': 'production',
            'kibana.space_ids': ['default'],
            'event.kind': 'signal',
            'event.action': 'open',
            'kibana.alert.workflow_status': 'open',
          },
        });

        setupToolCallThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_ALERTS,
          toolArg: {
            start: 'now-100h',
            end: 'now',
            includeRecovered: false,
            query: 'Summarize the active alerts in the requested range',
          },
        });

        await alertingApi.runRule(roleAuthc, createdRuleId);
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await deleteRules({ getService, roleAuthc, internalReqHeader });
        await kibanaServer.savedObjects.cleanStandardList();
        await deleteActionConnector(getService, { actionId: connectorId });
        llmProxy.close();
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns the correct tool results structure for a 4h window', async () => {
        setupToolCallThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_ALERTS,
          toolArg: {
            start: 'now-4h',
            end: 'now',
            includeRecovered: false,
            query: 'Summarize the active alerts in the last 4 hours',
          },
        });

        const body = await agentBuilderApiClient.converse({
          input: USER_PROMPT,
          connector_id: connectorId,
          agent_id: OBSERVABILITY_AGENT_ID,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        expect(body.response.message).to.be('final');

        const handoverRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === 'handover-to-answer'
        )!.requestBody;

        const toolResponseMessage = handoverRequest.messages[handoverRequest.messages.length - 1]!;
        const toolResponseContent = JSON.parse(toolResponseMessage.content as string) as {
          results: ToolResult[];
        };

        expect(toolResponseContent).to.have.property('results');
        expect(Array.isArray(toolResponseContent.results)).to.be(true);
        expect(toolResponseContent.results.length).to.be.greaterThan(0);

        const first = toolResponseContent.results[0];
        expect(isOtherResult(first)).to.be(true);

        const data = (first as OtherResult).data as Record<string, unknown>;
        expect(data).to.have.property('alerts');
        expect(Array.isArray(data.alerts as unknown[])).to.be(true);
        expect(data).to.have.property('total');
        expect(typeof data.total).to.be('number');
        expect(data).to.have.property('selectedFields');
        expect(Array.isArray(data.selectedFields as unknown[])).to.be(true);
      });

      it('returns active alerts within the time range and includes selected fields', async () => {
        const body = await agentBuilderApiClient.converse({
          input: 'Summarize active alerts over the last 100 hours',
          connector_id: connectorId,
          agent_id: OBSERVABILITY_AGENT_ID,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        expect(body.response.message).to.be('final');

        const handoverRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === 'handover-to-answer'
        )!.requestBody;

        const toolResponseMessage = handoverRequest.messages[handoverRequest.messages.length - 1]!;
        const toolResponseContent = JSON.parse(toolResponseMessage.content as string) as {
          results: ToolResult[];
        };

        const first = toolResponseContent.results[0] as OtherResult;
        expect(isOtherResult(first)).to.be(true);

        const data = first.data as Record<string, any>;

        expect(typeof data.total).to.be('number');
        expect(Array.isArray(data.alerts)).to.be(true);
        expect(Array.isArray(data.selectedFields)).to.be(true);

        const hasRecentRuleAlert = (data.alerts as any[]).some((a) => {
          return (
            a['kibana.alert.rule.name'] === 'Recent Alert' && a['kibana.alert.status'] === 'active'
          );
        });
        expect(hasRecentRuleAlert).to.be(true);
      });
    });
  });
}
