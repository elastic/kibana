/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';

const RISK_SCORE_RULE: typeof CUSTOM_QUERY_RULE = {
  ...CUSTOM_QUERY_RULE,
  name: 'Entity Analytics Management Test Rule',
  query: 'user.name:* or host.name:*',
  risk_score: 70,
  rule_id: 'entity-analytics-mgmt-rule',
};

// Tests run flat in a single describe (lint rules forbid both root-level
// siblings and nested describes). Use `v1:` / `v2:` prefixes on test titles
// to drive the entity-store API version in beforeEach/afterEach.
const isV2 = (title: string) => title.startsWith('v2:');

spaceTest.describe(
  'Entity analytics management page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }, { title }) => {
      // FF must be set BEFORE the browser loads the app — the UI's toggle
      // hook reads `securitySolution:entityStoreEnableV2` at render time and
      // caches the v1/v2 routing decision per session.
      await apiServices.entityAnalytics.setEntityStoreV2Enabled(isV2(title));
      if (isV2(title)) {
        await apiServices.entityAnalytics.uninstallEntityStoreV2();
      } else {
        await apiServices.entityAnalytics.deleteEntityStoreEngines();
      }
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      await apiServices.detectionRule.deleteAll();

      await apiServices.detectionRule.createCustomQueryRule({
        ...RISK_SCORE_RULE,
        name: `${RISK_SCORE_RULE.name}_${scoutSpace.id}_${Date.now()}`,
      });

      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }, { title }) => {
      if (isV2(title)) {
        await apiServices.entityAnalytics.uninstallEntityStoreV2();
      } else {
        await apiServices.entityAnalytics.deleteEntityStoreEngines();
      }
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      await apiServices.detectionRule.deleteAll();
      // Reset FF so a subsequent test starts on the v1 default.
      await apiServices.entityAnalytics.setEntityStoreV2Enabled(false);
    });

    spaceTest('v1: renders page title', async ({ pageObjects }) => {
      const managementPage = pageObjects.entityAnalyticsManagementPage;

      await managementPage.navigate();
      await expect(managementPage.pageTitle).toContainText('Entity analytics', { timeout: 30000 });
    });

    spaceTest(
      'v1: displays Entity Risk Score and Asset Criticality tabs',
      async ({ pageObjects }) => {
        const managementPage = pageObjects.entityAnalyticsManagementPage;

        await managementPage.navigate();
        await managementPage.waitForStatusLoaded();
        await expect(managementPage.riskScoreTab).toBeVisible();
        await expect(managementPage.assetCriticalityTab).toBeVisible();
      }
    );

    spaceTest(
      'v1: should init and disable entity analytics',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(240000);
        const managementPage = pageObjects.entityAnalyticsManagementPage;

        await spaceTest.step('Navigate and verify initial off state', async () => {
          await managementPage.navigate();
          await managementPage.waitForStatusLoaded();
          await expect(managementPage.entityAnalyticsHealth).toContainText('Off');
        });

        await spaceTest.step('Toggle on and verify enabled state', async () => {
          await managementPage.toggleEntityAnalytics();
          // Sync on backend readiness first. The UI shows "Off" while the entity
          // store is in `installing` state (status === 'enabling'), so asserting
          // UI text alone races against install completion. Mirrors
          // engine_status_management.spec.ts. See #259664.
          await apiServices.entityAnalytics.waitForEntityStoreStatus('running', 180000);
          await managementPage.waitForStatusLoaded();
          await expect(managementPage.entityAnalyticsHealth).toContainText('On', {
            timeout: 30000,
          });
        });

        await spaceTest.step('Toggle off and verify disabled state', async () => {
          await managementPage.toggleEntityAnalytics();
          // Toggle OFF stops the engines (status `stopped`) — it does not delete
          // them. Full deletion to `not_installed` only happens in afterEach via
          // deleteEntityStoreEngines. Wait for the post-stop backend state, then
          // assert the UI flip.
          await apiServices.entityAnalytics.waitForEntityStoreStatus('stopped', 60000);
          await managementPage.waitForStatusLoaded();
          await expect(managementPage.entityAnalyticsHealth).toContainText('Off', {
            timeout: 30000,
          });
        });
      }
    );

    spaceTest(
      'v1: should redirect old entity store URL to the management page',
      async ({ pageObjects }) => {
        const managementPage = pageObjects.entityAnalyticsManagementPage;

        await managementPage.navigateToOldEntityStoreUrl();
        await expect(managementPage.managementPage).toBeVisible({ timeout: 30000 });
        await expect(managementPage.pageTitle).toContainText('Entity analytics');
      }
    );

    spaceTest(
      'v1: should redirect old asset criticality URL to Asset Criticality tab',
      async ({ pageObjects }) => {
        const managementPage = pageObjects.entityAnalyticsManagementPage;

        await managementPage.navigateToOldAssetCriticalityUrl();
        await expect(managementPage.managementPage).toBeVisible({ timeout: 30000 });
        await expect(managementPage.assetCriticalityTab).toHaveAttribute('aria-selected', 'true');
      }
    );

    spaceTest('v1: should show error panel when init fails', async ({ pageObjects, page }) => {
      spaceTest.setTimeout(120000);
      const managementPage = pageObjects.entityAnalyticsManagementPage;

      await managementPage.navigate();
      await managementPage.waitForStatusLoaded();

      await expect(managementPage.entityAnalyticsHealth).toContainText('Off');

      await page.route('**/internal/risk_score/engine/init', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        })
      );

      await managementPage.toggleEntityAnalytics();

      await expect(managementPage.errorPanel).toContainText('There was an error', {
        timeout: 30000,
      });

      await page.unroute('**/internal/risk_score/engine/init');
    });

    spaceTest(
      'v2: should init and disable entity analytics',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(240000);
        const managementPage = pageObjects.entityAnalyticsManagementPage;

        await spaceTest.step('Navigate and verify initial off state', async () => {
          await managementPage.navigate();
          await managementPage.waitForStatusLoaded();
          await expect(managementPage.entityAnalyticsHealth).toContainText('Off');
        });

        await spaceTest.step('Toggle on and verify enabled state', async () => {
          await managementPage.toggleEntityAnalytics();
          // v2 toggle posts to `/api/security/entity_store/install`; poll the v2
          // status endpoint directly since v1's `/api/entity_store/status` is a
          // separate surface and may diverge.
          await apiServices.entityAnalytics.waitForEntityStoreStatusV2('running', 180000);
          await managementPage.waitForStatusLoaded();
          await expect(managementPage.entityAnalyticsHealth).toContainText('On', {
            timeout: 30000,
          });
        });

        await spaceTest.step('Toggle off and verify disabled state', async () => {
          await managementPage.toggleEntityAnalytics();
          // v2 toggle OFF calls `/api/security/entity_store/stop` which leaves
          // engines in `stopped` (uninstall happens in afterEach).
          await apiServices.entityAnalytics.waitForEntityStoreStatusV2('stopped', 60000);
          await managementPage.waitForStatusLoaded();
          await expect(managementPage.entityAnalyticsHealth).toContainText('Off', {
            timeout: 30000,
          });
        });
      }
    );

    spaceTest('v2: should show error panel when init fails', async ({ pageObjects, page }) => {
      spaceTest.setTimeout(120000);
      const managementPage = pageObjects.entityAnalyticsManagementPage;

      await managementPage.navigate();
      await managementPage.waitForStatusLoaded();

      await expect(managementPage.entityAnalyticsHealth).toContainText('Off');

      await page.route('**/internal/risk_score/engine/init', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        })
      );

      await managementPage.toggleEntityAnalytics();

      await expect(managementPage.errorPanel).toContainText('There was an error', {
        timeout: 30000,
      });

      await page.unroute('**/internal/risk_score/engine/init');
    });
  }
);
