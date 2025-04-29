/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { COMPARATORS } from '@kbn/alerting-comparators';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import {
  getMessageAddedEvents,
  invokeChatCompleteWithFunctionRequest,
} from '../../utils/conversation';
import { createRule, runRule } from '../../utils/alerts';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { indexSyntheticApmTransactions } from '../../synthtrace_scenarios/apm_transactions';

const apmTransactionRateRuleParams = {
  consumer: 'apm',
  name: 'apm_transaction_rate_obs_ai_assistant',
  rule_type_id: 'apm.transaction_error_rate',
  params: {
    threshold: 10,
    windowSize: 1,
    windowUnit: 'h',
    transactionType: undefined,
    serviceName: undefined,
    environment: 'production',
    searchConfiguration: {
      query: {
        query: ``,
        language: 'kuery',
      },
    },
    groupBy: ['service.name', 'service.environment'],
    useKqlFilter: true,
  },
  actions: [],
  schedule: {
    interval: '1m',
  },
};

const customThresholdRuleParams = {
  tags: ['observability', 'ai_assistant'],
  consumer: 'logs',
  name: 'Threshold Surpassed Error',
  rule_type_id: 'observability.rules.custom_threshold',
  params: {
    criteria: [
      {
        comparator: COMPARATORS.GREATER_THAN,
        threshold: [10],
        timeSize: 2,
        timeUnit: 'h',
        metrics: [{ name: 'A', filter: '', aggType: 'count' }],
      },
    ],
    groupBy: ['service.name'],
    alertOnNoData: true,
    alertOnGroupDisappear: true,
    searchConfiguration: {
      query: {
        query: '',
        language: 'kuery',
      },
      index: 'logs_synth',
    },
  },
  actions: [],
  schedule: {
    interval: '1m',
  },
};

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const synthtrace = getService('synthtrace');
  const samlAuth = getService('samlAuth');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('alerts', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
    let proxy: LlmProxy;
    let connectorId: string;
    let alertsEvents: MessageAddEvent[];

    const start = 'now-100h';
    const end = 'now';

    before(async () => {
      const internalReqHeader = samlAuth.getInternalRequestHeader();
      const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });

      const ruleIds = [];
      // Create first rule
      ruleIds.push(
        await createRule({
          getService,
          roleAuthc,
          internalReqHeader,
          data: apmTransactionRateRuleParams,
        })
      );
      // Create second rule
      ruleIds.push(
        await createRule({
          getService,
          roleAuthc,
          internalReqHeader,
          data: customThresholdRuleParams,
        })
      );

      log.debug(`Created ${ruleIds.length} rules.`);

      const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await indexSyntheticApmTransactions({
        apmSynthtraceEsClient,
        logger: log,
      });

      // Trigger rule run
      log.debug('Triggering a rule run');
      await Promise.all(
        ruleIds.map((ruleId) => runRule({ getService, roleAuthc, internalReqHeader, ruleId }))
      );

      log.debug('Waiting 2.5s to make sure all indices are refreshed');

      await new Promise((resolve) => {
        setTimeout(resolve, 2500);
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
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
    });

    // This test ensures that invoking the alerts function does not result in an error.
    it('should execute the function without any errors', async () => {
      const alertsFunctionResponse = alertsEvents[0];
      expect(alertsFunctionResponse.message.message.name).to.be('alerts');

      const parsedAlertsResponse = JSON.parse(alertsFunctionResponse.message.message.content!);

      expect(parsedAlertsResponse).not.to.have.property('error');
      expect(parsedAlertsResponse).to.have.property('total');
      expect(parsedAlertsResponse).to.have.property('alerts');
      expect(parsedAlertsResponse.alerts).to.be.an('array');
      expect(parsedAlertsResponse.total).to.be(0);
      expect(parsedAlertsResponse.alerts.length).to.be(0);
    });
  });
}
