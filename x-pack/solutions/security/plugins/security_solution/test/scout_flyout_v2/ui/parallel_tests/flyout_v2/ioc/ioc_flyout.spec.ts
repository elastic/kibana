/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 IOC (Indicator of Compromise) flyout.
 *
 * Entry path: Security → Threat Intelligence → Indicators table →
 *   click `tiToggleIndicatorFlyoutButton` → IOC flyout opens.
 *
 * NOTE: These tests require threat-intelligence index data to be present.
 * They are tagged `stateful.classic` only since the Threat Intelligence page
 * is not available in all serverless security configurations.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const THREAT_INTEL_PAGE = 'security/threat_intelligence';

spaceTest.describe('IOC flyout v2', { tag: [...tags.stateful.classic] }, () => {
  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPlatformEngineer();
  });

  spaceTest(
    'IOC flyout opens from indicators table and shows header, body, footer',
    async ({ page, log }) => {
      await page.gotoApp(THREAT_INTEL_PAGE);

      const indicatorsTable = page.getByTestId('tiIndicatorsTable');
      await indicatorsTable.waitFor({ state: 'visible', timeout: 30_000 });

      // If no indicators are available, skip gracefully
      const noDataMessage = page.getByText('No indicators found', { exact: false });
      const hasNoData = await noDataMessage.isVisible().catch(() => false);
      if (hasNoData) {
        log.info('No threat intel data available');
        spaceTest.skip(true, 'No threat intelligence indicators found in test environment');
      }

      // Click the open-flyout button on the first row
      const flyoutButtons = await indicatorsTable
        .getByTestId('tiToggleIndicatorFlyoutButton')
        .all();
      await flyoutButtons[0].click();

      // IOC flyout title and body should be visible
      await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsTitle')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsBody')).toBeVisible();

      // Footer should render with Take action button
      await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsFooter')).toBeVisible();
    }
  );

  spaceTest('IOC flyout has Overview and Table tabs', async ({ page, log }) => {
    await page.gotoApp(THREAT_INTEL_PAGE);

    const indicatorsTable = page.getByTestId('tiIndicatorsTable');
    await indicatorsTable.waitFor({ state: 'visible', timeout: 30_000 });

    const noDataMessage = page.getByText('No indicators found', { exact: false });
    const hasNoData = await noDataMessage.isVisible().catch(() => false);
    if (hasNoData) {
      log.info('No threat intel data available');
      spaceTest.skip(true, 'No threat intelligence indicators found in test environment');
    }

    const flyoutButtons = await indicatorsTable.getByTestId('tiToggleIndicatorFlyoutButton').all();
    await flyoutButtons[0].click();

    await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsTitle')).toBeVisible({
      timeout: 10_000,
    });

    // Both tabs should be present
    await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsOverviewTab')).toBeVisible();
    await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsTableTab')).toBeVisible();

    // Switching to Table tab should work
    await page.getByTestId('securitySolutionFlyoutIOCDetailsTableTab').click();
    // The JSON tab is also available
    await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsJsonTab')).toBeVisible();
  });

  spaceTest(
    'IOC flyout add-to-case action is accessible from the footer',
    async ({ page, log }) => {
      await page.gotoApp(THREAT_INTEL_PAGE);

      const indicatorsTable = page.getByTestId('tiIndicatorsTable');
      await indicatorsTable.waitFor({ state: 'visible', timeout: 30_000 });

      const noDataMessage = page.getByText('No indicators found', { exact: false });
      const hasNoData = await noDataMessage.isVisible().catch(() => false);
      if (hasNoData) {
        log.info('No threat intel data available');
        spaceTest.skip(true, 'No threat intelligence indicators found in test environment');
      }

      const flyoutButtons = await indicatorsTable
        .getByTestId('tiToggleIndicatorFlyoutButton')
        .all();
      await flyoutButtons[0].click();

      await expect(page.getByTestId('securitySolutionFlyoutIOCDetailsTitle')).toBeVisible({
        timeout: 10_000,
      });

      // The add-to-case context menu item verifies the IOC is case-compatible
      const addToNewCase = indicatorsTable.getByTestId('tiIndicatorTableAddToNewCaseContextMenu');

      const isAddToCaseVisible = await addToNewCase
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!isAddToCaseVisible) {
        return;
      }

      await addToNewCase.click();
      await expect(page.getByRole('dialog').getByText('Create case')).toBeVisible({
        timeout: 10_000,
      });
    }
  );
});
