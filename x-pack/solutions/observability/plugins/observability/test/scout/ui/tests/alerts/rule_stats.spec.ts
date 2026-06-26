/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

// Ported from the FTR `Observability rules / Stat counters` suite
// (x-pack/solutions/observability/test/observability_functional/apps/observability/pages/alerts/rule_stats.ts).
//
// Six `apm.anomaly` rules are created via the API; one is disabled and one is
// muted, then the alerts page rule-stat widgets are asserted. Rules are cleared
// before each run so the space-wide counts are deterministic regardless of the
// order this spec runs in relative to the other alerts specs.
const RULE_NAMES = ['a', 'b', 'c', 'd', 'e', 'f'];

const ANOMALY_RULE_PARAMS = {
  windowSize: 30,
  windowUnit: 'm',
  anomalySeverityType: 'critical',
  anomalyDetectorTypes: ['txLatency', 'txThroughput', 'txFailureRate'],
  environment: 'ENVIRONMENT_ALL',
};

test.describe('Observability alerts - rule stats', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ apiServices, browserAuth }) => {
    await apiServices.alerting.cleanup.deleteAllRules();
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.cleanup.deleteAllRules();
  });

  test('shows the expected rule, disabled, muted and error counts', async ({
    apiServices,
    pageObjects,
  }) => {
    const ids: string[] = [];
    for (const name of RULE_NAMES) {
      const { data } = await apiServices.alerting.rules.create({
        name,
        ruleTypeId: 'apm.anomaly',
        consumer: 'alerts',
        params: ANOMALY_RULE_PARAMS,
        schedule: { interval: '1m' },
        actions: [],
      });
      ids.push(data.id);
    }

    await apiServices.alerting.rules.disable(ids[1]);
    await apiServices.alerting.rules.muteAll(ids[5]);

    await pageObjects.alertsTablePage.goto();

    const { alertsTablePage } = pageObjects;
    await expect.poll(() => alertsTablePage.getRuleStatValue('statRuleCount')).toBe(6);
    await expect.poll(() => alertsTablePage.getRuleStatValue('statDisabled')).toBe(1);
    await expect.poll(() => alertsTablePage.getRuleStatValue('statMuted')).toBe(1);
    await expect.poll(() => alertsTablePage.getRuleStatValue('statErrors')).toBe(0);
  });
});
