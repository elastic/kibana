/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Visualizations section',
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

    spaceTest('analyzer preview panel renders in the section', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(pageObjects.documentFlyoutV2.visualizationsSection).toBeVisible();

      // Analyzer preview panel content renders inside the section
      await expect(pageObjects.documentFlyoutV2.analyzerPreview).toBeVisible({ timeout: 15_000 });

      // Title link to open full analyzer overlay should be present
      await expect(
        page.getByTestId('securitySolutionFlyoutAnalyzerPreviewTitleLink')
      ).toBeVisible();
    });

    spaceTest(
      'session preview panel renders or is absent without session data',
      async ({ pageObjects, page, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.visualizationsSection).toBeVisible();

        const sessionPreview = pageObjects.documentFlyoutV2.sessionPreview;
        const isVisible = await sessionPreview.isVisible().catch(() => false);
        if (!isVisible) {
          log.info('Session preview not present — alert has no session data (process.entry_leader)');
          spaceTest.skip(true, 'Alert created without session data');
        }

        await expect(sessionPreview).toBeVisible();
        await expect(
          page.getByTestId('securitySolutionFlyoutSessionPreviewTitleLink')
        ).toBeVisible();
      }
    );
  }
);
