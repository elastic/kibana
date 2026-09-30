/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { getEbtEvents, setEbtOptIn } from '../fixtures/ebt';
import { test } from '../fixtures/discover_actions';
import { loadDiscoverTelemetryData, unloadDiscoverTelemetryData } from '../fixtures/setup';

test.describe(
  'Discover observability telemetry context',
  { tag: ['@local-serverless-observability_complete'] },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient }) => {
      await loadDiscoverTelemetryData({ esArchiver, kbnClient });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await unloadDiscoverTelemetryData({ kbnClient });
    });

    test('sets EBT context for the observability root profile', async ({
      page,
      pageObjects,
      discoverEbt,
    }) => {
      const { discover } = pageObjects;
      await discover.goto({ queryMode: 'esql' });
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await discoverEbt.submitRecordedEsqlQuery('from my-example-* | sort @timestamp desc');

      await expect
        .poll(async () => {
          const events = await getEbtEvents(page, ['performance_metric']);
          return events.at(-1)?.context.discoverProfiles;
        })
        .toStrictEqual(['observability-root-profile', 'default-data-source-profile']);
    });

    test('sets the logs data source profile and clears it outside Discover', async ({
      page,
      pageObjects,
      discoverEbt,
    }) => {
      const { discover } = pageObjects;
      await discover.goto({ queryMode: 'esql' });
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await discoverEbt.submitRecordedEsqlQuery('from my-example-logs | sort @timestamp desc');

      await expect
        .poll(async () => {
          const events = await getEbtEvents(page, ['performance_metric']);
          return events.at(-1)?.context.discoverProfiles;
        })
        .toStrictEqual(['observability-root-profile', 'observability-logs-data-source-profile']);

      await page.gotoApp('management');
      await page.testSubj.locator('app-card-index_management').click();

      await expect
        .poll(async () => {
          const events = await getEbtEvents(page, ['click']);
          return events.at(-1)?.context.discoverProfiles;
        })
        .toStrictEqual([]);
    });

    test('does not set EBT context for Discover embeddables', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.datePicker.setAbsoluteRange({
        from: 'Sep 19, 2015 @ 06:31:44.000',
        to: 'Sep 23, 2015 @ 18:31:44.000',
      });
      await setEbtOptIn(page, true);
      await pageObjects.dashboard.addSavedSearch('A Saved Search');
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.components.dataGrid('docTable').rows).not.toHaveCount(0);
      await pageObjects.dashboard.openAddPanelFlyout();

      const events = await getEbtEvents(page, ['click']);
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((event) => !event.context.discoverProfiles?.length)).toBe(true);
    });
  }
);
