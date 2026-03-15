/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { getNewRule } from '../../../../common/rule_objects';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Expandable flyout left panel threat intelligence',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, getNewRule());
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTab').click();
      await page.testSubj
        .locator('securitySolutionFlyoutInsightsTabThreatIntelligenceButton')
        .click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display threat intelligence tab', async ({ page }) => {
      const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
      await expect(insightsTab).toHaveText('Insights');
      await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

      const tiButton = page.testSubj.locator(
        'securitySolutionFlyoutInsightsTabThreatIntelligenceButton'
      );
      await expect(tiButton).toHaveText('Threat intelligence');
      await expect(tiButton).toHaveClass(/euiButtonGroupButton-isSelected/);

      await expect(page.testSubj.locator('indicator-match-enrichment-section')).toBeVisible();
    });
  }
);
