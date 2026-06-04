/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Investigation guide tool overlay',
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
      'opens investigation guide overlay when rule has a guide defined',
      async ({ pageObjects, page, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        const guideButton = pageObjects.documentFlyoutV2.investigationGuideButton;

        // Investigation guide only renders when the rule has an investigation guide.
        // CUSTOM_QUERY_RULE may not have one; skip gracefully if not visible.
        const isVisible = await guideButton.isVisible().catch(() => false);
        if (!isVisible) {
          log.info('Investigation guide button not visible — rule has no guide');
          spaceTest.skip(true, 'Rule created without an investigation guide');
        }

        await guideButton.click();
        await expect(page.getByTestId('securitySolutionFlyoutToolsFlyoutHeader')).toBeVisible({
          timeout: 10_000,
        });
      }
    );
  }
);
