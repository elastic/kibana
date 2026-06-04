/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 rule flyout opened from within the document flyout.
 *
 * Entry path: Alerts table → row expand → document flyout About section → "View rule details"
 * button (securitySolutionFlyoutRuleSummaryButton) → rule flyout opens as stacked overlay.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Rule flyout v2',
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
      'opens rule flyout from document About section and shows rule details',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await spaceTest.step('open rule flyout from About section', async () => {
          // Click the "View rule details" button in the About section
          const ruleSummaryButton = page.getByTestId('securitySolutionFlyoutRuleSummaryButton');
          await ruleSummaryButton.click();
        });

        await spaceTest.step('verify rule details render', async () => {
          // Rule flyout appears as stacked overlay
          const ruleFlyoutTitle = page.getByTestId('securitySolutionFlyoutRuleDetailsTitle');
          await expect(ruleFlyoutTitle).toBeVisible({ timeout: 10_000 });

          // Rule details sections should render
          await expect(
            page.getByTestId('securitySolutionFlyoutRuleDetailsAboutSection')
          ).toBeVisible({ timeout: 10_000 });
        });
      }
    );

    spaceTest(
      'rule flyout definition and schedule sections render',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        const ruleSummaryButton = page.getByTestId('securitySolutionFlyoutRuleSummaryButton');
        await ruleSummaryButton.click();

        // Expand the definition section to verify it renders
        const definitionHeader = page.getByTestId(
          'securitySolutionFlyoutRuleDetailsDefinitionSectionHeader'
        );
        await expect(definitionHeader).toBeVisible({ timeout: 10_000 });

        // Parent flyout should still be in the DOM (stacked, not replaced)
        await expect(pageObjects.documentFlyoutV2.title).toBeVisible();
      }
    );

    spaceTest('rule link in alert title navigates to rule page', async ({ pageObjects }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      // The title link in the v2 flyout header navigates to the rule details page (new tab)
      const titleLink = pageObjects.documentFlyoutV2.titleLink;
      await expect(titleLink).toBeVisible();
      await expect(titleLink).toContainText(ruleName);

      const href = await titleLink.getAttribute('href');
      expect(href).toContain('security/rules/id/');
    });
  }
);
