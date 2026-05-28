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

spaceTest.describe(
  'Entity analytics management page (v2)',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      // FF must be set BEFORE the browser loads the app — the UI's toggle
      // hook reads `securitySolution:entityStoreEnableV2` at render time and
      // caches the v1/v2 routing decision per session.
      await apiServices.entityAnalytics.setEntityStoreV2Enabled(true);
      await apiServices.entityAnalytics.uninstallEntityStoreV2();
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      await apiServices.detectionRule.deleteAll();

      await apiServices.detectionRule.createCustomQueryRule({
        ...RISK_SCORE_RULE,
        name: `${RISK_SCORE_RULE.name}_${scoutSpace.id}_${Date.now()}`,
      });

      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.entityAnalytics.uninstallEntityStoreV2();
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      await apiServices.detectionRule.deleteAll();
      await apiServices.entityAnalytics.setEntityStoreV2Enabled(false);
    });

    spaceTest('should init and disable entity analytics', async ({ pageObjects, apiServices }) => {
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
    });
  }
);
