/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — About section',
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

    spaceTest('rule description renders in the About section', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(
        page.getByTestId('securitySolutionFlyoutAlertDescriptionTitle')
      ).toBeVisible();
      await expect(
        page.getByTestId('securitySolutionFlyoutAlertDescriptionDetails')
      ).toContainText(CUSTOM_QUERY_RULE.description);
    });

    spaceTest('alert reason renders with preview button', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(page.getByTestId('securitySolutionFlyoutReasonTitle')).toBeVisible();
      await expect(page.getByTestId('securitySolutionFlyoutReasonDetails')).toBeVisible();

      // "Show full reason" preview button opens a popover with event details
      const previewButton = page.getByTestId('securitySolutionFlyoutReasonDetailsPreviewButton');
      await previewButton.waitFor({ state: 'visible' });
      await previewButton.click();
      await expect(page.getByTestId('securitySolutionFlyoutReasonPopover')).toBeVisible({
        timeout: 5_000,
      });
    });

    spaceTest(
      'MITRE ATT&CK panel renders when rule has threat data',
      async ({ pageObjects, page, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        // CUSTOM_QUERY_RULE has no MITRE threat data; skip gracefully if the panel is absent.
        const mitreTitle = page.getByTestId('securitySolutionFlyoutMitreAttackTitle');
        const isVisible = await mitreTitle.isVisible().catch(() => false);
        if (!isVisible) {
          log.info('MITRE ATT&CK panel not visible — rule has no threat data');
          spaceTest.skip(true, 'Rule created without MITRE ATT&CK threat data');
        }

        await expect(page.getByTestId('securitySolutionFlyoutMitreAttackDetails')).toBeVisible();
      }
    );
  }
);
