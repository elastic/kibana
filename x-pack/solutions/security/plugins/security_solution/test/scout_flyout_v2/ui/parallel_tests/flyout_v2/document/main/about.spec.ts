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

    spaceTest(
      'rule description: "Show rule summary" opens the rule summary as a child flyout',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        // The About section and its "Show rule summary" button render for a readable rule.
        await expect(pageObjects.documentFlyoutV2.aboutSection).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.ruleSummaryButton).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.ruleSummaryButton).toBeEnabled();

        await pageObjects.documentFlyoutV2.openRuleSummary();

        // The rule summary opens as a child flyout titled with the rule name.
        await expect(pageObjects.documentFlyoutV2.ruleDetailsTitle).toContainText(ruleName);
      }
    );

    spaceTest(
      'alert reason: "Show full reason" popover key-value pairs expose working cell actions on hover',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.aboutSection).toBeVisible();

        // "Show full reason" opens a popover that renders the reason as key-value pairs.
        await pageObjects.documentFlyoutV2.openReasonPopover();
        await expect(pageObjects.documentFlyoutV2.reasonHostNameValue).toBeVisible({
          timeout: 10_000,
        });

        // Hovering a key-value pair reveals its cell-action buttons.
        await pageObjects.documentFlyoutV2.hoverReasonHostName();
        await expect(pageObjects.documentFlyoutV2.cellActionsFilterInButton).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.cellActionsFilterOutButton).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.cellActionsAddToTimelineButton).toBeVisible();

        // "Filter for" works: clicking it adds a single filter pill to the page search bar.
        await pageObjects.documentFlyoutV2.cellActionsFilterInButton.click();
        await expect(pageObjects.documentFlyoutV2.pageFilterBadges).toHaveCount(1, {
          timeout: 10_000,
        });
      }
    );
  }
);
