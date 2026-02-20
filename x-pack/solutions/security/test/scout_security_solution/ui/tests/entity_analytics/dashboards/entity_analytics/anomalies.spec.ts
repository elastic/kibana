/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Entity Analytics Dashboard',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('auditbeat_multiple');
    });

    test.beforeEach(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('network');
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await esArchiver.unload('auditbeat_multiple');
      } catch {
        // Best-effort
      }
    });

    test.afterEach(async ({ esArchiver }) => {
      try {
        await esArchiver.unload('network');
      } catch {
        // Best-effort
      }
    });

    test('should enable a job and renders the table with pagination', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.entityAnalyticsAnomalies.navigate();

      await expect(pageObjects.entityAnalyticsAnomalies.anomaliesTable.first()).toBeVisible({
        timeout: 30000,
      });
      await expect(pageObjects.entityAnalyticsAnomalies.anomaliesTableRows.first()).toBeVisible({
        timeout: 120000,
      });

      await pageObjects.entityAnalyticsAnomalies.enableJobInRow(5);
      await expect(pageObjects.entityAnalyticsAnomalies.enableJobLoader.first()).toBeVisible();

      await expect(pageObjects.entityAnalyticsAnomalies.anomaliesTableRows).toHaveCount(10);

      await pageObjects.entityAnalyticsAnomalies.clickNextPage();
      await expect(pageObjects.entityAnalyticsAnomalies.anomaliesTableRows).toHaveCount(10);

      await page.locator('[data-test-subj="loadingMoreSizeRowPopover"]').first().click();
      await page.getByTestId('tablePagination-25-rows').first().click();
      await expect(pageObjects.entityAnalyticsAnomalies.anomaliesTableRows).toHaveCount(25);
    });
  }
);
