/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  spaceTest,
  tags,
  CUSTOM_QUERY_RULE,
  TIMELINE_BOTTOM_BAR_TITLE_BUTTON_TEST_SUBJ,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Correlations tool overlay',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      const { sourceIndex } = await apiServices.correlations.createCorrelationsFixture(
        scoutSpace.id
      );

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
      });
      await browserAuth.loginAsT1Analyst();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.correlations.cleanupCorrelationsFixture(scoutSpace.id);
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest(
      'tools flyout header shows rule name with alert icon and opens child document flyout on click',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();
        await pageObjects.correlationsTool.titleLink.click();

        // Header shows the rule name and the alert (warning) icon
        await expect(pageObjects.correlationsTool.toolsFlyoutTitle).toContainText(ruleName);
        await expect(pageObjects.correlationsTool.toolsFlyoutTitleAlertIcon).toBeVisible();

        await pageObjects.correlationsTool.toolsFlyoutTitle.click();
        await pageObjects.documentFlyoutV2.waitForChildDocumentFlyout();
        await expect(
          pageObjects.documentFlyoutV2.childDocumentFlyout.getByTestId(
            'securitySolutionFlyoutAlertTitleText'
          )
        ).toContainText(ruleName);
      }
    );

    spaceTest(
      'opens correlations tool overlay and section row expand opens the correct child flyout',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();

        await pageObjects.correlationsTool.titleLink.waitFor({ state: 'visible' });
        await pageObjects.correlationsTool.titleLink.click();

        await expect(page.getByTestId('securitySolutionFlyoutToolsFlyoutHeader')).toBeVisible({
          timeout: 10_000,
        });

        await expect(pageObjects.correlationsTool.sameSourceAlertsSectionTable).toBeVisible();
        await pageObjects.correlationsTool.sameSourceAlertsSectionFirstPreviewButton.click();
        await pageObjects.documentFlyoutV2.waitForChildDocumentFlyout();
        await expect(
          pageObjects.documentFlyoutV2.childDocumentFlyout.getByTestId(
            'securitySolutionFlyoutAlertTitleText'
          )
        ).toContainText(ruleName);

        // Close the child flyout
        await page.keyboard.press('Escape');

        await expect(pageObjects.correlationsTool.sessionAlertsSectionTable).toBeVisible();
        await pageObjects.correlationsTool.sessionAlertsSectionFirstPreviewButton.click();
        await pageObjects.documentFlyoutV2.waitForChildDocumentFlyout();
        await expect(
          pageObjects.documentFlyoutV2.childDocumentFlyout.getByTestId(
            'securitySolutionFlyoutAlertTitleText'
          )
        ).toContainText(ruleName);

        // TODO: Related Attacks
      }
    );

    spaceTest(
      'sameSource section Investigate in timeline button opens the timeline',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();

        await pageObjects.correlationsTool.titleLink.waitFor({ state: 'visible' });
        await pageObjects.correlationsTool.titleLink.click();

        await expect(page.getByTestId('securitySolutionFlyoutToolsFlyoutHeader')).toBeVisible({
          timeout: 10_000,
        });

        await expect(pageObjects.correlationsTool.sameSourceAlertsSectionTable).toBeVisible();
        await pageObjects.correlationsTool.sameSourceAlertsSectionInvestigateInTimeline
          .getByRole('button')
          .click();

        await expect(page.getByTestId(TIMELINE_BOTTOM_BAR_TITLE_BUTTON_TEST_SUBJ)).toBeVisible({
          timeout: 15_000,
        });
        await expect(page.getByTestId('timeline-modal-header-panel')).toBeVisible();

        await expect(page.getByTestId('providerBadge')).toBeVisible();
        await expect(page.getByTestId('providerBadge')).toContainText('_id:');
      }
    );
  }
);
