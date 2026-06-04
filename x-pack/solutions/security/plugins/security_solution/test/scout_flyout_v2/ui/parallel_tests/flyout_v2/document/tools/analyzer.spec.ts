/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Analyzer tool overlay',
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

    spaceTest(
      'opens as stacked overlay; parent remains visible; closing overlay returns to parent',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await spaceTest.step('open analyzer overlay via title link', async () => {
          const analyzerTitleLink = page.getByTestId(
            'securitySolutionFlyoutAnalyzerPreviewTitleLink'
          );
          await analyzerTitleLink.waitFor({ state: 'visible' });
          await analyzerTitleLink.click();

          await expect(page.getByTestId('securitySolutionFlyoutAnalyzerGraph')).toBeVisible({
            timeout: 15_000,
          });
        });

        await spaceTest.step('parent flyout remains visible while overlay is open', async () => {
          await expect(pageObjects.documentFlyoutV2.title).toBeVisible();
        });

        await spaceTest.step('close overlay; parent flyout remains', async () => {
          const analyzerGraph = page.getByTestId('securitySolutionFlyoutAnalyzerGraph');
          const closeButton = page
            .getByRole('dialog')
            .filter({ has: page.getByTestId('securitySolutionFlyoutAnalyzerGraph') })
            .getByRole('button', { name: 'Close' });
          await closeButton.click();
          await expect(analyzerGraph).not.toBeVisible({ timeout: 5_000 });
          await expect(pageObjects.documentFlyoutV2.title).toBeVisible();
        });
      }
    );
  }
);
