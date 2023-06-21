/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const indexThresholdRuleName = 'kibana sites - low bytes';
export const metricThresholdRuleName = 'network metric packets';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const actions = getService('actions');
  const rules = getService('rules');

  describe('stack alerting', function () {
    let itRuleId: string;
    let mtRuleId: string;
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
    });

    after(async () => {
      await rules.api.deleteRule(itRuleId);
      await rules.api.deleteRule(mtRuleId);
      await rules.api.deleteAllRules();
      await actions.api.deleteConnector(serverLogConnectorId);
      await actions.api.deleteAllConnectors();
    });

    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./index_threshold_rule'));
    loadTestFile(require.resolve('./metrics_threshold_rule'));
    loadTestFile(require.resolve('./tracking_containment_rule'));
  });
}
