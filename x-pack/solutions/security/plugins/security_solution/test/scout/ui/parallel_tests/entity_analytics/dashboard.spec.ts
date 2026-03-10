/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Entity analytics dashboard page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices }) => {
      await apiServices.entityAnalytics.deleteEntityStoreEngines();
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.entityAnalytics.deleteEntityStoreEngines();
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
    });

    spaceTest('enables risk score followed by the store', async ({ pageObjects, apiServices }) => {
      spaceTest.setTimeout(180000);
      const dashboardPage = pageObjects.entityAnalyticsDashboardsPage;

      await spaceTest.step('Navigate to dashboard and verify initial state', async () => {
        await dashboardPage.navigate();

        await expect(dashboardPage.entityStoreEnablementPanel).toContainText(
          'Enable entity store and risk score',
          { timeout: 30000 }
        );
      });

      await spaceTest.step('Open enablement modal and verify options', async () => {
        await dashboardPage.openEntityStoreEnablementModal();

        await expect(dashboardPage.entityStoreEnablementModal).toContainText(
          'Entity Analytics Enablement'
        );
        await expect(dashboardPage.enablementRiskScoreSwitch).toBeVisible();
        await expect(dashboardPage.enablementEntityStoreSwitch).toBeVisible();
      });

      await spaceTest.step('Confirm enablement and verify success', async () => {
        await dashboardPage.confirmEntityStoreEnablement();

        await expect(dashboardPage.entityStoreEnablementModal).toBeHidden({ timeout: 10000 });
      });

      await spaceTest.step(
        'Verify risk engine and entity store are actually enabled via API',
        async () => {
          const entityStoreStatus = await apiServices.entityAnalytics.waitForEntityStoreStatus(
            'running',
            120000
          );
          expect(entityStoreStatus.status).toBe('running');

          const riskEngineStatus = await apiServices.entityAnalytics.getRiskEngineStatus();
          expect(riskEngineStatus.risk_engine_status).toBe('ENABLED');
        }
      );

      await spaceTest.step('Verify UI reflects the enabled state', async () => {
        await dashboardPage.navigate();
        await expect(dashboardPage.entitiesListPanel).toContainText('Entities', { timeout: 30000 });
      });
    });
  }
);
