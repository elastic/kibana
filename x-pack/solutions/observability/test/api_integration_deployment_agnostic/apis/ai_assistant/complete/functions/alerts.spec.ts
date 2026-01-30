/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type { SearchAlertsResult } from '@kbn/alerts-ui-shared/src/common/apis/search_alerts/search_alerts';
import type { LlmProxy } from '../../utils/create_llm_proxy';
import { createLlmProxy } from '../../utils/create_llm_proxy';
import {
  getMessageAddedEvents,
  invokeChatCompleteWithFunctionRequest,
} from '../../utils/conversation';
import { createRule, deleteRules } from '../../utils/alerts';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { createSyntheticApmData } from '../../synthtrace_scenarios/create_synthetic_apm_data';
import { APM_ALERTS_INDEX as APM_ALERTS_INDEX_PATTERN } from '../../../apm/alerts/helpers/alerting_helper';

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

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const samlAuth = getService('samlAuth');
  const alertingApi = getService('alertingApi');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const kibanaServer = getService('kibanaServer');

  describe('tool: alerts', function () {
    // LLM Proxy is not yet support in MKI: https://github.com/elastic/obs-ai-assistant-team/issues/199
    this.tags(['skipCloud']);
    let proxy: LlmProxy;
    let connectorId: string;
    let alertsEvents: MessageAddEvent[];
    let internalReqHeader: InternalRequestHeader;
    let roleAuthc: RoleCredentials;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let createdRuleId: string;
    let parsedAlertsResponse: SearchAlertsResult;

    const start = 'now-100h';
    const end = 'now';

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      internalReqHeader = samlAuth.getInternalRequestHeader();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      ({ apmSynthtraceEsClient } = await createSyntheticApmData({ getService }));

      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      // Create alerting rule
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

      void proxy.interceptWithResponse('Hello from LLM Proxy');

      const alertsResponseBody = await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'alerts',
          trigger: MessageRole.Assistant,
          arguments: JSON.stringify({ start, end }),
        },
      });

      await proxy.waitForAllInterceptorsToHaveBeenCalled();

      alertsEvents = getMessageAddedEvents(alertsResponseBody);
      const alertsFunctionResponse = alertsEvents[0];
      parsedAlertsResponse = JSON.parse(alertsFunctionResponse.message.message.content!);
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });

      await apmSynthtraceEsClient.clean();
      await alertingApi.cleanUpAlerts({
        roleAuthc,
        ruleId: createdRuleId,
        alertIndexName: APM_ALERTS_INDEX_PATTERN,
        consumer: 'apm',
      });
      await deleteRules({ getService, roleAuthc, internalReqHeader });

      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should execute the function without any errors', async () => {
      expect(alertsEvents[0].message.message.name).to.be('alerts');

      expect(parsedAlertsResponse).not.to.have.property('error');
      expect(parsedAlertsResponse).to.have.property('total');
      expect(parsedAlertsResponse).to.have.property('alerts');
      expect(parsedAlertsResponse.alerts).to.be.an('array');
    });

    it('should retrieve 1 active alert', async () => {
      expect(parsedAlertsResponse.total).to.be(1);
      expect(parsedAlertsResponse.alerts.length).to.be(1);
      expect(parsedAlertsResponse.alerts[0]['kibana.alert.status']).to.eql('active');
    });

    it('should retrieve correct alert information', async () => {
      const alert = parsedAlertsResponse.alerts[0];

      expect(alert['service.environment']).to.eql(alertRuleData.environment);
      expect(alert['kibana.alert.rule.consumer']).to.eql(alertRuleData.consumer);
      expect(alert['kibana.alert.evaluation.threshold']).to.eql(alertRuleData.threshold);
      expect(alert['kibana.alert.rule.rule_type_id']).to.eql(alertRuleData.ruleTypeId);
      expect(alert['kibana.alert.rule.name']).to.eql(alertRuleData.ruleName);
    });

    it('should only return alerts that started within the requested range', async () => {
      const returnedAlert = parsedAlertsResponse.alerts[0];
      expect(returnedAlert['kibana.alert.rule.name']).to.be(RECENT_ALERT_RULE_NAME);

      const alertStartTime = new Date(returnedAlert['kibana.alert.start'] as unknown as string);
      const from = new Date(Date.now() - 100 * 60 * 60 * 1000); // now-100h
      const to = new Date();

      expect(alertStartTime >= from && alertStartTime <= to).to.be(true);
    });
  });
}
