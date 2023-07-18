/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const metricThresholdRuleName = 'network metric packets';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const actions = getService('actions');
  const rules = getService('rules');

  describe('observability alerting', function () {
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
      await rules.api.deleteRule(mtRuleId);
      await rules.api.deleteAllRules();
      await actions.api.deleteConnector(serverLogConnectorId);
      await actions.api.deleteAllConnectors();
    });

    loadTestFile(require.resolve('./list_view'));
  });
}
