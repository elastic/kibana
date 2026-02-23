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

test.describe('Expandable flyout left panel correlations', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices, getNewRule());
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
    await page.testSubj.locator('expand-event').click();
    await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();

    // TODO: create a case linked to the alert for the related cases section
    await page.testSubj.locator('securitySolutionFlyoutInsightsTab').click();
    await page.testSubj.locator('securitySolutionFlyoutInsightsTabCorrelationsButton').click();
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should render correlations details correctly', async ({ page }) => {
    const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
    await expect(insightsTab).toHaveText('Insights');
    await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

    const correlationsButton = page.testSubj.locator(
      'securitySolutionFlyoutInsightsTabCorrelationsButton'
    );
    await expect(correlationsButton).toHaveText('Correlations');
    await expect(correlationsButton).toHaveClass(/euiButtonGroupButton-isSelected/);

    await test.step('Verify related alerts by source event', async () => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySourceSectionTitle')
      ).toContainText('alert related by source event');
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySourceSectionTable')
      ).toBeVisible();
      await expect(
        page.testSubj.locator(
          'securitySolutionFlyoutCorrelationsRelatedBySourceSectionInvestigateInTimelineButton'
        )
      ).toContainText('Investigate in timeline');
    });

    await test.step('Verify related alerts by session', async () => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySessionSectionTitle')
      ).toContainText('alert related by session');
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySessionSectionTable')
      ).toBeVisible();
      await expect(
        page.testSubj.locator(
          'securitySolutionFlyoutCorrelationsRelatedBySessionSectionInvestigateInTimelineButton'
        )
      ).toContainText('Investigate in timeline');
    });

    await test.step('Verify related alerts by ancestry', async () => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedByAncestrySectionTitle')
      ).toContainText('alert related by ancestry');
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedByAncestrySectionTable')
      ).toBeVisible();
      await expect(
        page.testSubj.locator(
          'securitySolutionFlyoutCorrelationsRelatedByAncestrySectionInvestigateInTimelineButton'
        )
      ).toContainText('Investigate in timeline');
    });
  });
});
