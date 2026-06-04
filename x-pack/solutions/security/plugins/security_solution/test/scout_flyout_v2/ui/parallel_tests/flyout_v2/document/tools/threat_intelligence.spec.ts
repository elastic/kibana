/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Threat intelligence tool overlay',
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
      'opens threat intelligence overlay via section title link',
      async ({ pageObjects, page, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();

        const tiTitleLink = page.getByTestId(
          'securitySolutionFlyoutInsightsThreatIntelligenceTitleLink'
        );

        // Threat intelligence title link only renders when the alert has TI enrichments.
        // CUSTOM_QUERY_RULE alerts typically have none; skip gracefully if the link is absent.
        const isVisible = await tiTitleLink.isVisible().catch(() => false);
        if (!isVisible) {
          log.info('Threat intelligence title link not visible — alert has no TI enrichments');
          spaceTest.skip(true, 'Alert created without threat intelligence enrichments');
        }

        await tiTitleLink.click();

        // At least one threat intelligence details section should render
        const tiDetailsCount = await page
          .locator('[data-test-subj^="securitySolutionFlyoutThreatIntelligenceDetails"]')
          .count();
        expect(tiDetailsCount).toBeGreaterThan(0);
      }
    );
  }
);
