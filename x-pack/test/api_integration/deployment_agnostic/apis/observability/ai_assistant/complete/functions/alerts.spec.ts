/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole, MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { SearchAlertsResult } from '@kbn/alerts-ui-shared/src/common/apis/search_alerts/search_alerts';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import {
  getMessageAddedEvents,
  invokeChatCompleteWithFunctionRequest,
} from '../../utils/conversation';
import { createRule, deleteRules } from '../../utils/alerts';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { createSyntheticApmData } from '../../synthtrace_scenarios/create_synthetic_apm_data';
import { APM_ALERTS_INDEX } from '../../../apm/alerts/helpers/alerting_helper';

const alertRuleData = {
  ruleTypeId: ApmRuleType.TransactionErrorRate,
  indexName: APM_ALERTS_INDEX,
  consumer: 'apm',
  environment: 'production',
  threshold: 1,
  windowSize: 1,
  windowUnit: 'h',
  ruleName: 'APM transaction error rate',
};

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const samlAuth = getService('samlAuth');
  const alertingApi = getService('alertingApi');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('alerts', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
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
      internalReqHeader = samlAuth.getInternalRequestHeader();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      ({ apmSynthtraceEsClient } = await createSyntheticApmData({ getService }));

      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      createdRuleId = await createRule({
        getService,
        roleAuthc,
        internalReqHeader,
        data: alertRuleData,
      });

      void proxy.interceptConversation('Hello from LLM Proxy');

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
        alertIndexName: APM_ALERTS_INDEX,
        consumer: 'apm',
      });
      await deleteRules({ getService, roleAuthc, internalReqHeader });

      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
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
  });
}
