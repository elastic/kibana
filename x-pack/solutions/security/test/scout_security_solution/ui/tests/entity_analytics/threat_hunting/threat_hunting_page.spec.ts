/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

test.describe(
  'Entity Threat Hunting page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('all_users');
    });

    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.entityAnalyticsThreatHunting.navigate();
      await expect(page).toHaveURL(/entity_analytics_threat_hunting/);
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        // no-op: Scout EsArchiverFixture does not support unload;
      } catch {
        // Best-effort cleanup
      }
    });

    test('renders page as expected', async ({ page, pageObjects }) => {
      await expect(pageObjects.entityAnalyticsThreatHunting.pageTitle.first()).toBeVisible({
        timeout: 60000,
      });
      await expect(
        page.getByRole('heading', { name: 'Entity Threat Hunting' }).first()
      ).toBeVisible();
    });

    test('renders KQL search bar', async ({ page, pageObjects }) => {
      await expect(pageObjects.entityAnalyticsThreatHunting.pageTitle.first()).toBeVisible({
        timeout: 60000,
      });
      await expect(page.getByTestId('globalQueryBar').first()).toBeVisible({ timeout: 30000 });
    });

    test('renders combined risk donut chart', async ({ pageObjects }) => {
      await expect(pageObjects.entityAnalyticsThreatHunting.pageTitle.first()).toBeVisible({
        timeout: 60000,
      });
      await expect(
        pageObjects.entityAnalyticsThreatHunting.combinedRiskDonutChart.first()
      ).toBeVisible({ timeout: 30000 });
    });

    test('renders anomalies placeholder panel', async ({ page, pageObjects }) => {
      await expect(pageObjects.entityAnalyticsThreatHunting.pageTitle.first()).toBeVisible({
        timeout: 60000,
      });
      await expect(
        pageObjects.entityAnalyticsThreatHunting.anomaliesPlaceholderPanel.first()
      ).toBeVisible({ timeout: 30000 });
      await expect(
        pageObjects.entityAnalyticsThreatHunting.anomaliesPlaceholderPanel.first()
      ).toContainText('Anomaly explorer');
    });

    test('renders entities table', async ({ page, pageObjects }) => {
      await expect(pageObjects.entityAnalyticsThreatHunting.pageTitle.first()).toBeVisible({
        timeout: 60000,
      });
      await expect(
        pageObjects.entityAnalyticsThreatHunting.threatHuntingEntitiesTable.first()
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page
          .locator(
            '[data-test-subj="paginated-basic-table"], [data-test-subj="initialLoadingPanelPaginatedTable"]'
          )
          .first()
      ).toBeVisible({ timeout: 30000 });
    });
  }
);
