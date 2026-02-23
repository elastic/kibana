/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { ALERTS_URL } from '../../../common/urls';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';

test.describe('Alerts Table Action column', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.PROCESS_ANCESTRY);
  });

  test.afterAll(async ({ esArchiver }) => {
    // no-op: Scout EsArchiverFixture does not support unload;
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
  });

  test('should have session viewer button visible and open session viewer on click', async ({
    page,
  }) => {
    const sessionViewerButton = page.testSubj.locator('session-view-button');
    await expect(sessionViewerButton).toBeVisible();
    await sessionViewerButton.click();

    const expandAlertBtn = page.testSubj.locator('expand-event');
    await expandAlertBtn.click();

    const visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
    await expect(visualizeTab).toHaveText('Visualize');
    await expect(visualizeTab).toHaveClass(/euiTab-isSelected/);

    const sessionViewButton = page.testSubj.locator(
      'securitySolutionFlyoutVisualizeTabSessionViewButton'
    );
    await expect(sessionViewButton).toHaveText('Session View');
    await expect(sessionViewButton).toHaveClass(/euiButtonGroupButton-isSelected/);
  });

  test('should have analyzer button visible and open analyzer on click', async ({ page }) => {
    const analyzerButton = page.testSubj.locator('view-in-analyzer');
    await expect(analyzerButton).toBeVisible();
    await analyzerButton.click();

    const expandAlertBtn = page.testSubj.locator('expand-event');
    await expandAlertBtn.click();

    const visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
    await expect(visualizeTab).toHaveText('Visualize');
    await expect(visualizeTab).toHaveClass(/euiTab-isSelected/);

    const analyzerGraphButton = page.testSubj.locator(
      'securitySolutionFlyoutVisualizeTabGraphAnalyzerButton'
    );
    await expect(analyzerGraphButton).toHaveText('Analyzer Graph');
    await expect(analyzerGraphButton).toHaveClass(/euiButtonGroupButton-isSelected/);

    const analyzerContent = page.testSubj.locator(
      'securitySolutionFlyoutVisualizeTabGraphAnalyzerContent'
    );
    await expect(analyzerContent).toBeVisible();
  });
});
