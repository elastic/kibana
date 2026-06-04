/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Correlations tool overlay',
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
      'opens correlations tool overlay via section title link',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();

        const correlationsTitleLink = page.getByTestId(
          'securitySolutionFlyoutCorrelationsTitleLink'
        );
        await correlationsTitleLink.waitFor({ state: 'visible' });
        await correlationsTitleLink.click();

        await expect(page.getByTestId('securitySolutionFlyoutToolsFlyoutHeader')).toBeVisible({
          timeout: 10_000,
        });
        // At least one correlations section should render
        const correlationsCount = await page
          .locator('[data-test-subj^="securitySolutionFlyoutCorrelationsDetails"]')
          .count();
        expect(correlationsCount).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'closing parent flyout while correlations overlay is open does not crash',
      async ({ pageObjects, page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await spaceTest.step('open correlations overlay', async () => {
          const correlationsTitleLink = page.getByTestId(
            'securitySolutionFlyoutCorrelationsTitleLink'
          );
          await correlationsTitleLink.waitFor({ state: 'visible' });
          await correlationsTitleLink.click();
          await expect(page.getByTestId('securitySolutionFlyoutToolsFlyoutHeader')).toBeVisible({
            timeout: 10_000,
          });
        });

        await spaceTest.step('close parent flyout while overlay is open', async () => {
          const parentDialog = page
            .getByRole('dialog')
            .filter({ has: page.getByTestId('securitySolutionFlyoutAlertTitle') });
          await parentDialog.getByRole('button', { name: 'Close' }).click();

          await expect(pageObjects.documentFlyoutV2.title).not.toBeVisible({ timeout: 5_000 });
        });

        await spaceTest.step('verify no React errors fired', async () => {
          const flyoutErrors = consoleErrors.filter(
            (e) => e.includes('Emotion') || e.includes('Cannot read') || e.includes('unmount')
          );
          expect(flyoutErrors).toHaveLength(0);
        });
      }
    );
  }
);
