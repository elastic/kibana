/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Response tool overlay',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: ['auditbeat-*'],
      });
      // platform_engineer has `actions_log_management_read`, required (with a platinum+ license)
      // for the flyout to fetch and render automated response actions.
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await apiServices.responseActions.cleanupResponseActions();
    });

    spaceTest(
      'shows the no-data empty state with a header that opens the child document flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        // The Response section is collapsed by default; expand it to reveal the details button.
        await pageObjects.documentFlyout.responseSection.click();
        await pageObjects.documentFlyout.responseButton.click();

        await expect(pageObjects.responseTool.content).toBeVisible({ timeout: 10_000 });

        // No response actions exist for this alert, so the empty state is shown and no result renders.
        await expect(pageObjects.responseTool.noData).toBeVisible({ timeout: 10_000 });
        await expect(pageObjects.responseTool.endpointActionResult).toHaveCount(0);

        // Header shows the rule name and the alert (warning) icon
        await expect(pageObjects.responseTool.toolsFlyoutTitle).toContainText(ruleName);
        await expect(pageObjects.responseTool.toolsFlyoutTitleAlertIcon).toBeVisible();

        // Clicking the header opens a child document flyout for the same alert
        await pageObjects.responseTool.toolsFlyoutTitle.click();
        await pageObjects.documentFlyout.waitForChildDocumentFlyout();
        await expect(pageObjects.documentFlyout.childDocumentAlertTitle).toContainText(ruleName);
      }
    );

    spaceTest(
      'renders an automated endpoint response action result for the alert',
      async ({ pageObjects, apiServices }) => {
        // Link a seeded automated endpoint action to this rule's alert so the response section has
        // data to render instead of the empty state.
        const alertId = await apiServices.detectionAlerts.getAlertId(ruleName, 60_000);
        await apiServices.responseActions.seedAutomatedEndpointAction({ alertId, ruleName });

        await pageObjects.documentFlyout.openForRule(ruleName);

        // The Response section is collapsed by default; expand it to reveal the details button.
        await pageObjects.documentFlyout.responseSection.click();
        await pageObjects.documentFlyout.responseButton.click();

        await expect(pageObjects.responseTool.content).toBeVisible({ timeout: 10_000 });

        // The seeded endpoint action renders as a result comment attributed to the rule, and the
        // empty state is not shown.
        await expect(pageObjects.responseTool.endpointActionResult).toBeVisible({
          timeout: 15_000,
        });
        await expect(pageObjects.responseTool.endpointActionResult).toContainText(ruleName);
        await expect(pageObjects.responseTool.noData).toHaveCount(0);
      }
    );
  }
);
