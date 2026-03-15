/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Investigate in timeline', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should open new timeline from alerts table', async ({ page }) => {
    const investigateBtn = page.testSubj.locator('send-alert-to-timeline-button');
    await investigateBtn.click();

    const providerBadge = page.testSubj.locator('providerContainer');
    await expect(providerBadge).toBeVisible();
  });

  test('should open a new timeline from take action button in flyout', async ({ page }) => {
    await page.testSubj.locator('expand-event').click();

    await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
    await page.testSubj.locator('investigate-in-timeline-action-item').click();

    const timelineTitle = page.testSubj.locator('timelineTitle');
    await expect(timelineTitle).toHaveText('Untitled timeline');

    const queryTab = page.testSubj.locator('timelineTabs-default');
    await expect(queryTab).toHaveClass(/euiTab-isSelected/);
  });

  test('should navigate to analyzer graph tab from flyout', async ({ page }) => {
    await page.testSubj.locator('expand-event').click();

    await test.step('Expand left panel and navigate to visualize', async () => {
      const aboutSection = page.testSubj.locator(
        'securitySolutionFlyoutOverviewTabAboutSectionHeader'
      );
      await aboutSection.click();

      const investigationSection = page.testSubj.locator(
        'securitySolutionFlyoutOverviewTabInvestigationSectionHeader'
      );
      await investigationSection.click();

      const visualizationsSection = page.testSubj.locator(
        'securitySolutionFlyoutOverviewTabVisualizationsSectionHeader'
      );
      await visualizationsSection.click();

      const analyzerPreview = page.testSubj.locator(
        'securitySolutionFlyoutOverviewTabAnalyzerPreviewTitle'
      );
      await analyzerPreview.click();
    });

    await test.step('Verify analyzer graph tab is selected', async () => {
      const visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
      await expect(visualizeTab).toHaveText('Visualize');
      await expect(visualizeTab).toHaveClass(/euiTab-isSelected/);

      const analyzerButton = page.testSubj.locator(
        'securitySolutionFlyoutVisualizeTabGraphAnalyzerButton'
      );
      await expect(analyzerButton).toHaveText('Analyzer Graph');
      await expect(analyzerButton).toHaveClass(/euiButtonGroupButton-isSelected/);

      const analyzerContent = page.testSubj.locator(
        'securitySolutionFlyoutVisualizeTabGraphAnalyzerContent'
      );
      await expect(analyzerContent).toBeVisible();
    });
  });

  test('should open a new timeline from the prevalence detail table', async ({ page }) => {
    await page.testSubj.locator('expand-event').click();

    await test.step('Expand left panel and go to prevalence', async () => {
      await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();

      const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
      await insightsTab.click();

      const prevalenceTab = page.testSubj.locator('securitySolutionFlyoutPrevalenceTab');
      await prevalenceTab.click();
    });

    await test.step('Open timeline from prevalence table', async () => {
      const timelineButton = page.testSubj.locator(
        'securitySolutionFlyoutPrevalenceTableInvestigateInTimeline'
      );
      await timelineButton.click();

      const timelineTitle = page.testSubj.locator('timelineTitle');
      await expect(timelineTitle).toHaveText('Untitled timeline');
    });
  });

  test('should open a new timeline from the correlations tab', async ({ page }) => {
    await page.testSubj.locator('expand-event').click();

    await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();

    const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
    await insightsTab.click();

    const correlationsTab = page.testSubj.locator('securitySolutionFlyoutCorrelationsTab');
    await correlationsTab.click();

    await test.step('Open timeline from related source event', async () => {
      const sourceEventTimeline = page.testSubj.locator(
        'securitySolutionFlyoutCorrelationsTabRelatedSourceEventInvestigateInTimeline'
      );
      await sourceEventTimeline.click();

      const timelineTitle = page.testSubj.locator('timelineTitle');
      await expect(timelineTitle).toHaveText('Untitled timeline');

      await page.testSubj.locator('close-timeline').click();
    });

    await test.step('Open timeline from related by session', async () => {
      const sessionTimeline = page.testSubj.locator(
        'securitySolutionFlyoutCorrelationsTabRelatedBySessionInvestigateInTimeline'
      );
      await sessionTimeline.click();

      const timelineTitle = page.testSubj.locator('timelineTitle');
      await expect(timelineTitle).toHaveText('Untitled timeline');

      await page.testSubj.locator('close-timeline').click();
    });

    await test.step('Open timeline from related by ancestry', async () => {
      const ancestryTimeline = page.testSubj.locator(
        'securitySolutionFlyoutCorrelationsTabRelatedByAncestryInvestigateInTimeline'
      );
      await ancestryTimeline.click();

      const timelineTitle = page.testSubj.locator('timelineTitle');
      await expect(timelineTitle).toHaveText('Untitled timeline');
    });
  });
});
