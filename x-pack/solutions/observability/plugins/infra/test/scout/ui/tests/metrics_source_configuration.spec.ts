/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { DATE_WITH_HOSTS_DATA, EXTENDED_TIMEOUT } from '../fixtures/constants';
import {
  cleanHostsFlyoutSynthtraceData,
  cleanNonTsdsSystemTemplate,
  ensureNonTsdsSystemTemplate,
  ingestHostsFlyoutSynthtraceData,
} from '../fixtures/sequential_hosts_synthtrace';

const SOURCE_ID = 'default';
const SOURCE_CONFIG_PATH = `/api/metrics/source/${SOURCE_ID}`;

// String literals mirroring InfraRuleType.MetricThreshold / Aggregators.AVERAGE /
// COMPARATORS.GREATER_THAN — kept inline so the Scout test package does not need to
// depend on @kbn/rule-data-utils, @kbn/infra-plugin or @kbn/alerting-comparators.
const METRIC_THRESHOLD_RULE_TYPE_ID = 'metrics.alert.threshold';

interface SourceConfigurationResponse {
  source: {
    configuration: {
      name: string;
      metricAlias: string;
    };
  };
}

/**
 * Migrated from the FTR `metrics_source_configuration` functional suite. Runs in the
 * sequential (non-parallel) `tests/` config because it mutates the space-scoped default
 * source configuration; the persisted defaults are restored after every test so the
 * mutation never leaks into other sequential specs sharing this Kibana instance.
 *
 * The suite is stateful by default. Most tests also opt into serverless Observability
 * Complete. The "used by rules" case stays stateful-only: `metrics.alert.threshold` is
 * gated by `featureFlags.metricThresholdAlertRuleEnabled` and is not registered on
 * serverless (same reason `alerts_flyouts` leaves the metrics-threshold flyout stateful).
 */
test.describe('Infrastructure source configuration', { tag: tags.stateful.classic }, () => {
  let defaultConfig: { name: string; metricAlias: string };

  test.beforeAll(async ({ esClient, kbnUrl, log, config, kbnClient }) => {
    // Ingest fixed-date host metrics so the inventory waffle map can render.
    await ensureNonTsdsSystemTemplate(esClient, log);
    await cleanHostsFlyoutSynthtraceData({ esClient, kbnUrl, log, config });
    await ingestHostsFlyoutSynthtraceData({ esClient, kbnUrl, log, config });

    // Capture the persisted defaults so every test can restore them afterwards.
    const { data } = await kbnClient.request<SourceConfigurationResponse>({
      method: 'GET',
      path: SOURCE_CONFIG_PATH,
    });
    defaultConfig = {
      name: data.source.configuration.name,
      metricAlias: data.source.configuration.metricAlias,
    };
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    // Restore the persisted defaults so a mutated metric alias never leaks into the
    // next test (or other sequential specs sharing this Kibana instance).
    await kbnClient.request({
      method: 'PATCH',
      path: SOURCE_CONFIG_PATH,
      body: { name: defaultConfig.name, metricAlias: defaultConfig.metricAlias },
    });
  });

  test.afterAll(async ({ esClient, kbnUrl, log, config }) => {
    await cleanHostsFlyoutSynthtraceData({ esClient, kbnUrl, log, config });
    await cleanNonTsdsSystemTemplate(esClient, log);
  });

  test(
    'renders the waffle map with the default metric indices',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { inventoryPage } }) => {
      await inventoryPage.goToPage();
      await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
      await expect(inventoryPage.waffleMap).toBeVisible();
    }
  );

  test(
    'reflects a non-matching metric index pattern across settings and the inventory',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { inventoryPage, metricsSettingsPage } }) => {
      await test.step('shows the missing-indices callout after saving a non-matching pattern', async () => {
        await metricsSettingsPage.goto();
        await metricsSettingsPage.setName('Modified Source');
        await metricsSettingsPage.setMetricIndices('does-not-exist-*');
        await metricsSettingsPage.save();
        await expect(metricsSettingsPage.missingMetricIndicesCallout).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('renders the no-data screen on the inventory', async () => {
        await inventoryPage.goToPage({ skipLoadWait: true });
        await expect(inventoryPage.noDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });
    }
  );

  test(
    'resets unsaved changes when discarding',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { metricsSettingsPage } }) => {
      await metricsSettingsPage.goto();
      const previousName = await metricsSettingsPage.getName();

      await metricsSettingsPage.setName('New Source');
      await metricsSettingsPage.setMetricIndices('this-is-new-change-*');
      await metricsSettingsPage.discardChanges();

      await expect(metricsSettingsPage.nameInput).toHaveValue(previousName);
    }
  );

  test(
    'reflects a remote-cluster metric index pattern across settings and the inventory',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { inventoryPage, metricsSettingsPage } }) => {
      await test.step('shows the remote-cluster danger callout after saving', async () => {
        await metricsSettingsPage.goto();
        await metricsSettingsPage.setName('Modified Source');
        await metricsSettingsPage.setMetricIndices('remote_cluster:metricbeat-*');
        await metricsSettingsPage.save();
        await expect(metricsSettingsPage.remoteClusterDangerCallout).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('renders the no-remote-cluster prompt on the inventory', async () => {
        await inventoryPage.goToPage({ skipLoadWait: true });
        await expect(inventoryPage.noRemoteClusterPrompt).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    }
  );

  // Stateful-only: metric threshold rule type is not registered on serverless.
  test('warns when editing an index pattern used by an alerting rule', async ({
    apiServices,
    pageObjects: { metricsSettingsPage },
  }) => {
    const { data: rule } = await apiServices.alerting.rules.create({
      name: 'Infra source configuration test rule',
      ruleTypeId: METRIC_THRESHOLD_RULE_TYPE_ID,
      consumer: 'infrastructure',
      tags: ['infrastructure'],
      schedule: { interval: '1m' },
      params: {
        criteria: [
          {
            aggType: 'avg',
            comparator: '>',
            threshold: [0.5],
            timeSize: 5,
            timeUnit: 'm',
            metric: 'system.cpu.user.pct',
          },
        ],
        sourceId: SOURCE_ID,
        alertOnNoData: true,
        alertOnGroupDisappear: true,
      },
    });

    try {
      await metricsSettingsPage.goto();
      await metricsSettingsPage.setMetricIndices('newMatch');
      await expect(metricsSettingsPage.usedByRulesWarningCallout).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    } finally {
      await apiServices.alerting.rules.delete(rule.id);
    }
  });
});
