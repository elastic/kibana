/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { ToolResult, OtherResult } from '@kbn/agent-builder-common';
import { isOtherResult } from '@kbn/agent-builder-common/tools';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-plugin/server/agent/register_observability_agent';
import {
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  defaultFields,
} from '@kbn/observability-agent-plugin/server/tools';
import type { SearchAlertsResult } from '@kbn/alerts-ui-shared/src/common/apis/search_alerts/search_alerts';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { APM_ALERTS_INDEX as APM_ALERTS_INDEX_PATTERN } from '../../apm/alerts/helpers/alerting_helper';
import type { AgentBuilderApiClient } from '../utils/agent_builder_client';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import { setupObservabilityAlertsToolThenAnswer } from '../utils/llm_proxy/scenarios';
import { createSyntheticApmData } from '../utils/synthtrace_scenarios';
import { createRule, deleteRules } from '../utils/alerts/alerting_rules';

const LLM_EXPOSED_TOOL_NAME_FOR_GET_ALERTS = 'observability_get_alerts';
const USER_PROMPT = 'Do I have any alerts over the last 100 hours?';
const QUERY_ARG_FOR_TOOL_CALL = 'alerts in the last 100 hours';

const RECENT_ALERT_RULE_NAME = 'Recent Alert';
const OLD_ALERT_DOC_RULE_NAME = 'Manually Indexed Old Alert';
const APM_ALERTS_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';

const alertRuleData = {
  ruleTypeId: ApmRuleType.TransactionErrorRate,
  indexName: APM_ALERTS_INDEX_PATTERN,
  consumer: 'apm',
  environment: 'production',
  threshold: 1,
  windowSize: 1,
  windowUnit: 'h',
  ruleName: RECENT_ALERT_RULE_NAME,
};

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
      let connectorId: string;
      let createdRuleId: string;
      let llmProxy: LlmProxy;
      let agentBuilderApiClient: AgentBuilderApiClient;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let roleAuthc: RoleCredentials;
      let internalReqHeader: InternalRequestHeader;
      let toolResponseContent: { results: ToolResult[] };

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
          data: alertRuleData,
        });

        // Manually index old alert
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        await es.index({
          index: APM_ALERTS_INDEX,
          refresh: 'wait_for',
          document: {
            '@timestamp': new Date().toISOString(),
            'kibana.alert.start': eightDaysAgo,
            'kibana.alert.status': 'active',
            'kibana.alert.rule.name': OLD_ALERT_DOC_RULE_NAME,
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

        // Run the created rule to generate an alert
        await alertingApi.runRule(roleAuthc, createdRuleId);

        setupObservabilityAlertsToolThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_GET_ALERTS,
          toolArg: {
            start: 'now-100h',
            end: 'now',
            includeRecovered: false,
            query: QUERY_ARG_FOR_TOOL_CALL,
          },
          fieldIds: defaultFields,
        });

        await agentBuilderApiClient.converse({
          input: USER_PROMPT,
          connector_id: connectorId,
          agent_id: OBSERVABILITY_AGENT_ID,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const toolRequest = llmProxy.interceptedRequests
          .slice()
          .reverse()
          .find((r) => r.requestBody?.messages?.some((m: any) => m.role === 'tool'));

        const toolMessages = toolRequest?.requestBody?.messages;
        if (toolMessages) {
          const toolResponseMessage = [...toolMessages]
            .reverse()
            .find((m: any) => m.role === 'tool')!;
          toolResponseContent = JSON.parse(toolResponseMessage.content as string) as {
            results: ToolResult[];
          };
        }
      });

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });

        await apmSynthtraceEsClient.clean();
        await alertingApi.cleanUpAlerts({
          roleAuthc,
          ruleId: createdRuleId,
          alertIndexName: APM_ALERTS_INDEX_PATTERN,
          consumer: 'apm',
        });
        await deleteRules({ getService, roleAuthc, internalReqHeader });

        await kibanaServer.savedObjects.cleanStandardList();
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns the correct tool results structure', () => {
        expect(toolResponseContent).to.have.property('results');
        expect(Array.isArray(toolResponseContent.results)).to.be(true);
        expect(toolResponseContent.results.length).to.be.greaterThan(0);

        const toolResult = toolResponseContent.results[0] as OtherResult;
        expect(isOtherResult(toolResult)).to.be(true);

        const { data } = toolResult as OtherResult;

        expect(data).to.have.property('alerts');
        expect(data.alerts).to.be.an('array');

        expect(data).to.have.property('total');
        expect(data).to.have.property('selectedFields');
        expect(data.selectedFields).to.be.an('array');
      });

      it('should retrieve 1 active alert', async () => {
        const data = (toolResponseContent.results[0] as OtherResult)
          .data as unknown as SearchAlertsResult;

        expect(data.total).to.be(1);
        expect(data.alerts.length).to.be(1);
        expect(data.alerts[0]['kibana.alert.status']).to.eql('active');
      });

      it('should retrieve correct alert information', async () => {
        const data = (toolResponseContent.results[0] as OtherResult)
          .data as unknown as SearchAlertsResult;
        const alert = data.alerts[0];

        expect(alert['service.environment']).to.eql(alertRuleData.environment);
        expect(alert['kibana.alert.rule.consumer']).to.eql(alertRuleData.consumer);
        expect(alert['kibana.alert.evaluation.threshold']).to.eql(alertRuleData.threshold);
        expect(alert['kibana.alert.rule.rule_type_id']).to.eql(alertRuleData.ruleTypeId);
        expect(alert['kibana.alert.rule.name']).to.eql(alertRuleData.ruleName);
      });

      it('should only return alerts that started within the requested range', async () => {
        const data = (toolResponseContent.results[0] as OtherResult)
          .data as unknown as SearchAlertsResult;
        const returnedAlert = data.alerts[0];
        expect(returnedAlert['kibana.alert.rule.name']).to.be(RECENT_ALERT_RULE_NAME);

        const alertStartTime = new Date(returnedAlert['kibana.alert.start'] as unknown as string);
        const from = new Date(Date.now() - 100 * 60 * 60 * 1000); // now-100h
        const to = new Date();

        expect(alertStartTime >= from && alertStartTime <= to).to.be(true);
      });
    });
  });
}
