/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Insights section',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest('entities sub-panel renders host or user overview card', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();
      await expect(pageObjects.documentFlyoutV2.entitiesOverview).toBeVisible({ timeout: 10_000 });

      // At least a host or user overview card should appear
      const hostCard = pageObjects.documentFlyoutV2.entityHostOverview;
      const userCard = pageObjects.documentFlyoutV2.entityUserOverview;
      await expect(hostCard.or(userCard)).toBeVisible({ timeout: 10_000 });
    });

    spaceTest('entities host card shows hostname link', async ({ pageObjects }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(pageObjects.documentFlyoutV2.entityHostOverview).toBeVisible({ timeout: 10_000 });
      // Host name link opens the host entity flyout
      await expect(pageObjects.documentFlyoutV2.entityHostName).toBeVisible();
    });

    spaceTest('correlations sub-panel renders at least one row', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(pageObjects.documentFlyoutV2.correlations).toBeVisible({ timeout: 10_000 });

      // At least one correlations row should render (related cases, ancestry, session, etc.)
      const correlationRows = page.locator(
        '[data-test-subj^="securitySolutionFlyoutCorrelations"]'
      );
      await expect(correlationRows.first()).toBeVisible({ timeout: 10_000 });
    });

    spaceTest('prevalence sub-panel renders', async ({ pageObjects }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(pageObjects.documentFlyoutV2.prevalence).toBeVisible({ timeout: 10_000 });
    });

    spaceTest('threat intelligence sub-panel renders', async ({ pageObjects }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(pageObjects.documentFlyoutV2.threatIntelligence).toBeVisible({ timeout: 10_000 });
    });
  }
);
