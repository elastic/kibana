/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const indexThresholdRuleName = 'kibana sites - low bytes';
export const metricThresholdRuleName = 'network metric packets';
export const esQueryRuleName = 'sample logs query rule';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const actions = getService('actions');
  const rules = getService('rules');
  const validQueryJson = JSON.stringify({
    query: {
      bool: {
        filter: [
          {
            term: {
              'host.keyword': 'www.elastic.co',
            },
          },
        ],
      },
    },
  });

  describe('stack alerting', function () {
    let itRuleId: string;
    let mtRuleId: string;
    let esRuleId: string;
    let serverLogConnectorId: string;
    before(async () => {
      await browser.setWindowSize(1920, 1080);
      ({ id: serverLogConnectorId } = await actions.api.createConnector({
        name: 'my-server-log-connector',
        config: {},
        secrets: {},
        connectorTypeId: '.server-log',
      }));
      ({ id: itRuleId } = await rules.api.createRule({
        consumer: 'alerts',
        name: indexThresholdRuleName,
        notifyWhen: 'onActionGroupChange',
        params: {
          index: ['kibana_sample_data_logs'],
          timeField: '@timestamp',
          aggType: 'sum',
          aggField: 'bytes',
          groupBy: 'top',
          termField: 'host.keyword',
          termSize: 4,
          timeWindowSize: 24,
          timeWindowUnit: 'h',
          thresholdComparator: '>',
          threshold: [4200],
        },
        ruleTypeId: '.index-threshold',
        schedule: { interval: '1m' },
        actions: [
          {
            group: 'threshold met',
            id: serverLogConnectorId,
            params: {
              level: 'info',
              message: 'Test',
            },
          },
        ],
      }));
      ({ id: mtRuleId } = await rules.api.createRule({
        consumer: 'infrastructure',
        name: metricThresholdRuleName,
        notifyWhen: 'onActionGroupChange',
        params: {
          criteria: [
            {
              aggType: 'max',
              comparator: '>',
              threshold: [0],
              timeSize: 3,
              timeUnit: 's',
              metric: 'network.packets',
            },
          ],
          sourceId: 'default',
          alertOnNoData: false,
          alertOnGroupDisappear: false,
          groupBy: ['network.name'],
        },
        ruleTypeId: 'metrics.alert.threshold',
        schedule: { interval: '1m' },
        actions: [
          {
            group: 'metrics.threshold.fired',
            id: serverLogConnectorId,
            params: {
              level: 'info',
              message: 'Test Metric Threshold rule',
            },
          },
        ],
      }));
      ({ id: esRuleId } = await rules.api.createRule({
        consumer: 'alerts',
        name: esQueryRuleName,
        params: {
          index: ['kibana_sample_data_logs'],
          timeField: '@timestamp',
          timeWindowSize: 1,
          timeWindowUnit: 'd',
          thresholdComparator: '>',
          threshold: [100],
          size: 100,
          esQuery: validQueryJson,
        },
        ruleTypeId: '.es-query',
        schedule: { interval: '1d' },
        actions: [
          {
            group: 'query matched',
            id: serverLogConnectorId,
            frequency: {
              throttle: '2d',
              summary: true,
              notify_when: 'onThrottleInterval',
            },
            params: {
              level: 'info',
              message:
                'The system has detected {{alerts.new.count}} new, {{alerts.ongoing.count}} ongoing, and {{alerts.recovered.count}} recovered alerts.',
            },
          },
          {
            group: 'recovered',
            id: serverLogConnectorId,
            frequency: {
              summary: false,
              notify_when: 'onActionGroupChange',
            },
            params: {
              level: 'info',
              message: '{{alert.id}} has recovered.',
            },
          },
        ],
      }));
    });

    after(async () => {
      await rules.api.deleteRule(itRuleId);
      await rules.api.deleteRule(mtRuleId);
      await rules.api.deleteRule(esRuleId);
      await rules.api.deleteAllRules();
      await actions.api.deleteConnector(serverLogConnectorId);
      await actions.api.deleteAllConnectors();
    });

    loadTestFile(require.resolve('./es_query_rule'));
    loadTestFile(require.resolve('./index_threshold_rule'));
    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./metrics_threshold_rule'));
    loadTestFile(require.resolve('./tracking_containment_rule'));
  });
}
