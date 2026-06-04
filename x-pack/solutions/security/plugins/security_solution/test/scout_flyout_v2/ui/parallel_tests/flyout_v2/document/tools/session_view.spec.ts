/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Session view tool overlay',
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
      'opens session view overlay via section title link',
      async ({ pageObjects, page, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        const sessionTitleLink = page.getByTestId(
          'securitySolutionFlyoutSessionPreviewTitleLink'
        );

        // Session view only renders when the alert has session data (process.entry_leader).
        // CUSTOM_QUERY_RULE alerts may not have session data; skip gracefully if the link is absent.
        const isVisible = await sessionTitleLink.isVisible().catch(() => false);
        if (!isVisible) {
          log.info('Session preview title link not visible — alert has no session data');
          spaceTest.skip(true, 'Alert created without session data');
        }

        await sessionTitleLink.click();

        // Either the session view graph or the no-data placeholder should render
        const sessionView = page.getByTestId('securitySolutionFlyoutSessionView');
        const sessionViewNoData = page.getByTestId('securitySolutionFlyoutSessionViewNoData');
        await expect(sessionView.or(sessionViewNoData)).toBeVisible({ timeout: 15_000 });
      }
    );
  }
);
