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
  'Alert details expandable flyout left panel analyzer graph',
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

      await page.testSubj.locator('securitySolutionFlyoutVisualizeTab').click();
      await page.testSubj.locator('securitySolutionFlyoutVisualizeTabGraphAnalyzerButton').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display analyzer graph and node list under visualize', async ({ page }) => {
      const visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
      await expect(visualizeTab).toHaveText('Visualize');
      await expect(visualizeTab).toHaveClass(/euiTab-isSelected/);

      const analyzerButton = page.testSubj.locator(
        'securitySolutionFlyoutVisualizeTabGraphAnalyzerButton'
      );
      await expect(analyzerButton).toHaveText('Analyzer Graph');
      await expect(analyzerButton).toHaveClass(/euiButtonGroupButton-isSelected/);

      await expect(page.testSubj.locator('securitySolutionFlyoutAnalyzerGraph')).toBeVisible();
    });
  }
);
