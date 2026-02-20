/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

test.describe(
  'Entity analytics dashboard page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await apiServices.entityAnalytics.deleteEntityStoreEngines();
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ apiServices }) => {
      try {
        await apiServices.entityAnalytics.deleteEntityStoreEngines();
        await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      } catch {
        // Cleanup best-effort
      }
    });

    test('enables risk score followed by the store', async ({
      pageObjects,
      page,
    }) => {
      const dashboardPage = pageObjects.entityAnalyticsDashboardsPage;

      await test.step('Navigate to dashboard and verify initial state', async () => {
        await dashboardPage.navigate();
        await expect(
          dashboardPage.entityStoreEnablementPanel.getByText(
            'Enable entity store and risk score'
          )
        ).toBeVisible({ timeout: 30000 });
      });

      await test.step('Open enablement modal and verify options', async () => {
        await dashboardPage.openEntityStoreEnablementModal();
        await expect(
          dashboardPage.entityStoreEnablementModal.getByText('Entity Analytics Enablement')
        ).toBeVisible();
        await expect(dashboardPage.enablementRiskScoreSwitch.first()).toBeVisible();
        await expect(dashboardPage.enablementEntityStoreSwitch.first()).toBeVisible();
      });

      await test.step('Confirm enablement and verify success', async () => {
        await dashboardPage.confirmEntityStoreEnablement();
        await expect(
          page.getByText('Entities', { exact: false })
        ).toBeVisible({ timeout: 30000 });
      });
    });
  }
);
