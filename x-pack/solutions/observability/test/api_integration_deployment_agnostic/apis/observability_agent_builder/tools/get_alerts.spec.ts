/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { generateApmErrorData, indexAll } from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { APM_ALERTS_INDEX as APM_ALERTS_INDEX_PATTERN } from '../../apm/alerts/helpers/alerting_helper';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createRule, deleteRules } from '../utils/alerts/alerting_rules';

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

interface GetAlertsToolResult extends OtherResult {
  data: {
    total: number;
    alerts: Array<Record<string, unknown>>;
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const samlAuth = getService('samlAuth');
  const alertingApi = getService('alertingApi');
  const kibanaServer = getService('kibanaServer');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_ALERTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    let createdRuleId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      internalReqHeader = samlAuth.getInternalRequestHeader();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const range = timerange('now-15m', 'now');

      await indexAll(
        generateApmErrorData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          serviceName: 'test-service',
          environment: 'production',
          language: 'go',
        })
      );

      createdRuleId = await createRule({
        getService,
        roleAuthc,
        internalReqHeader,
        data: alertRuleData,
      });

      // Manually index old alert (8 days ago - outside the 100h range)
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
    });

    after(async () => {
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

    describe('when fetching alerts', () => {
      let resultData: GetAlertsToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetAlertsToolResult>({
          id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
          params: {
            start: 'now-100h',
            end: 'now',
            includeRecovered: false,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns the correct tool results structure', () => {
        expect(resultData).to.have.property('alerts');
        expect(resultData.alerts).to.be.an('array');
        expect(resultData).to.have.property('total');
      });

      it('should retrieve 1 active alert', () => {
        expect(resultData.total).to.be(1);
        expect(resultData.alerts.length).to.be(1);
        expect(resultData.alerts[0]['kibana.alert.status']).to.eql('active');
      });

      it('should retrieve correct alert information', () => {
        const alert = resultData.alerts[0];

        expect(alert['service.environment']).to.eql(alertRuleData.environment);
        expect(alert['kibana.alert.rule.consumer']).to.eql(alertRuleData.consumer);
        expect(alert['kibana.alert.evaluation.threshold']).to.eql(alertRuleData.threshold);
        expect(alert['kibana.alert.rule.rule_type_id']).to.eql(alertRuleData.ruleTypeId);
        expect(alert['kibana.alert.rule.name']).to.eql(alertRuleData.ruleName);
      });

      it('should only return alerts that started within the requested range', () => {
        const returnedAlert = resultData.alerts[0];
        expect(returnedAlert['kibana.alert.rule.name']).to.be(RECENT_ALERT_RULE_NAME);

        const alertStartTime = new Date(returnedAlert['kibana.alert.start'] as string);
        const from = new Date(Date.now() - 100 * 60 * 60 * 1000); // now-100h
        const to = new Date();

        expect(alertStartTime >= from && alertStartTime <= to).to.be(true);
      });
    });

    describe('when using kqlFilter parameter', () => {
      it('filters alerts by KQL query for a specific rule name', async () => {
        const results = await agentBuilderApiClient.executeTool<GetAlertsToolResult>({
          id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
          params: {
            start: 'now-100h',
            end: 'now',
            kqlFilter: `kibana.alert.rule.name: "${RECENT_ALERT_RULE_NAME}"`,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.alerts.length).to.be(1);
        expect(results[0].data.alerts[0]['kibana.alert.rule.name']).to.be(RECENT_ALERT_RULE_NAME);
      });

      it('filters alerts by service environment', async () => {
        const results = await agentBuilderApiClient.executeTool<GetAlertsToolResult>({
          id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
          params: {
            start: 'now-100h',
            end: 'now',
            kqlFilter: 'service.environment: production',
          },
        });

        expect(results).to.have.length(1);

        for (const alert of results[0].data.alerts) {
          expect(alert['service.environment']).to.eql('production');
        }
      });
    });

    describe('when using fields parameter', () => {
      it('returns only the specified fields when fields param is provided', async () => {
        const requestedFields = [
          'kibana.alert.rule.name',
          'kibana.alert.status',
          'service.environment',
        ];

        const results = await agentBuilderApiClient.executeTool<GetAlertsToolResult>({
          id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
          params: {
            start: 'now-100h',
            end: 'now',
            fields: requestedFields,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.alerts.length).to.be(1);

        const alert = results[0].data.alerts[0];
        const returnedFields = Object.keys(alert);

        expect(returnedFields.sort()).to.eql(requestedFields.sort());

        expect(alert).to.not.have.property('@timestamp');
        expect(alert).to.not.have.property('kibana.alert.start');
        expect(alert).to.not.have.property('kibana.alert.reason');

        expect(alert['kibana.alert.rule.name']).to.be(RECENT_ALERT_RULE_NAME);
        expect(alert['kibana.alert.status']).to.eql('active');
        expect(alert['service.environment']).to.eql('production');
      });

      it('returns default fields when fields param is not provided', async () => {
        const results = await agentBuilderApiClient.executeTool<GetAlertsToolResult>({
          id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
          params: {
            start: 'now-100h',
            end: 'now',
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.alerts.length).to.be(1);

        const alert = results[0].data.alerts[0];

        expect(alert).to.have.property('kibana.alert.status');
        expect(alert).to.have.property('kibana.alert.rule.name');
        expect(alert).to.have.property('kibana.alert.start');
      });
    });
  });
}
