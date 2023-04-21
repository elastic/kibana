/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const indexThresholdRuleName = 'kibana sites - low bytes';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const actions = getService('actions');
  const rules = getService('rules');

  describe('stack alerting', function () {
    let ruleId: string;
    let serverLogConnectorId: string;
    before(async () => {
      await browser.setWindowSize(1920, 1080);
      ({ id: serverLogConnectorId } = await actions.api.createConnector({
        name: 'my-server-log-connector',
        config: {},
        secrets: {},
        connectorTypeId: '.server-log',
      }));
      ({ id: ruleId } = await rules.api.createRule({
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
    });

    after(async () => {
      await rules.api.deleteRule(ruleId);
      await rules.api.deleteAllRules();
      await actions.api.deleteConnector(serverLogConnectorId);
      await actions.api.deleteAllConnectors();
    });

    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./index_threshold_rule'));
    loadTestFile(require.resolve('./tracking_containment_rule'));
  });
}
