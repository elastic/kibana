/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('Entity analytics dashboard page', { tag: ['@ess'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, apiServices }) => {
    await apiServices.entityAnalytics.deleteEntityStoreEngines();
    await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.entityAnalytics.deleteEntityStoreEngines();
    await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
  });

  spaceTest('enables risk score followed by the store', async ({ pageObjects }) => {
    const dashboardPage = pageObjects.entityAnalyticsDashboardsPage;

    await dashboardPage.navigate();

    await expect(dashboardPage.entityStoreEnablementPanel, { timeout: 30000 }).toContainText(
      'Enable entity store and risk score'
    );

    await dashboardPage.openEntityStoreEnablementModal();

    await expect(dashboardPage.entityStoreEnablementModal).toContainText(
      'Entity Analytics Enablement'
    );
    await expect(dashboardPage.enablementRiskScoreSwitch).toBeVisible();
    await expect(dashboardPage.enablementEntityStoreSwitch).toBeVisible();

    await dashboardPage.confirmEntityStoreEnablement();
    await dashboardPage.waitForEntitiesListToAppear();
    await dashboardPage.entitiesListPanel.waitFor({ state: 'visible' });

    await expect(dashboardPage.entitiesListPanel).toContainText('Entities');
  });
});
