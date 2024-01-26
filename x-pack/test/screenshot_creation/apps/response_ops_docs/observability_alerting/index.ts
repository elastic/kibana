/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const metricThresholdRuleName = 'network metric packets';
export const inventoryRuleName = 'CPU';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const actions = getService('actions');
  const rules = getService('rules');
  const emailConnectorName = 'Email connector 1';

  describe('observability alerting', function () {
    let mtRuleId: string;
    let invRuleId: string;
    let emailConnectorId: string;
    before(async () => {
      await browser.setWindowSize(1920, 1080);
      ({ id: emailConnectorId } = await actions.api.createConnector({
        name: emailConnectorName,
        config: {
          service: 'other',
          from: 'bob@example.com',
          host: 'some.non.existent.com',
          port: 25,
        },
        secrets: {
          user: 'bob',
          password: 'supersecret',
        },
        connectorTypeId: '.email',
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
            id: emailConnectorId,
            params: {
              level: 'info',
            },
          },
        ],
      }));
      ({ id: invRuleId } = await rules.api.createRule({
        consumer: 'alerts',
        name: inventoryRuleName,
        notifyWhen: 'onActionGroupChange',
        params: {
          nodeType: 'host',
          criteria: [
            {
              comparator: '>',
              threshold: [80],
              timeSize: 3,
              timeUnit: 'm',
              metric: 'cpu',
            },
          ],
          sourceId: 'default',
        },
        ruleTypeId: 'metrics.alert.inventory.threshold',
        schedule: { interval: '1m' },
        actions: [
          {
            group: 'metrics.inventory_threshold.fired',
            id: emailConnectorId,
            params: {
              level: 'info',
            },
          },
        ],
      }));
    });

    after(async () => {
      await rules.api.deleteRule(mtRuleId);
      await rules.api.deleteRule(invRuleId);
      await rules.api.deleteAllRules();
      await actions.api.deleteConnector(emailConnectorId);
      await actions.api.deleteAllConnectors();
    });

    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./inventory_rule'));
    loadTestFile(require.resolve('./metric_threshold_rule'));
  });
}
