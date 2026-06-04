/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Investigation section',
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
      'investigation guide shows no-guide callout when rule has no guide',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        // CUSTOM_QUERY_RULE has no investigation guide; the callout message should render
        // and the "Show investigation guide" button should be absent.
        const guideContainer = page.getByTestId('securitySolutionFlyoutInvestigationGuide');
        await guideContainer.waitFor({ state: 'visible' });
        await expect(guideContainer).toContainText("There's no investigation guide for this rule.");
        await expect(
          page.getByTestId('securitySolutionFlyoutInvestigationGuideButton')
        ).toBeHidden();
      }
    );

    spaceTest('highlighted fields table renders', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
      await pageObjects.documentFlyoutV2.waitForAlertFlyout();

      await expect(
        page.getByTestId('securitySolutionFlyoutHighlightedFieldsTitle')
      ).toBeVisible();
      await expect(
        page.getByTestId('securitySolutionFlyoutHighlightedFieldsDetails')
      ).toBeVisible();

      // At least one field cell should be present
      const fieldCells = page.locator(
        '[data-test-subj^="securitySolutionFlyoutHighlightedFieldsCell"]'
      );
      await expect(fieldCells.first()).toBeVisible({ timeout: 10_000 });
    });

    spaceTest(
      'highlighted fields edit button opens the customization modal',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        const editButton = page.getByTestId('securitySolutionFlyoutHighlightedFieldsEditButton');
        await editButton.waitFor({ state: 'visible' });
        await editButton.click();

        await expect(
          page.getByTestId('securitySolutionFlyoutHighlightedFieldsModal')
        ).toBeVisible({ timeout: 5_000 });
        await expect(
          page.getByTestId('securitySolutionFlyoutHighlightedFieldsModalTitle')
        ).toBeVisible();
      }
    );
  }
);
