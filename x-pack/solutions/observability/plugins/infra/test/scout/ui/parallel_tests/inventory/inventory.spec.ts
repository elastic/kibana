/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Infrastructure Inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await inventoryPage.goToPage();
  });

  test('Render expected content', async ({ page }) => {
    await test.step('set the correct browser page title', async () => {
      const title = await page.title();
      expect(title).toBe('Infrastructure inventory - Infrastructure - Observability - Elastic');
    });

    await test.step('display inventory survey link', async () => {
      await expect(page.getByTestId('infraInventoryFeedbackLink')).toBeVisible();
    });

    await test.step('display waffle map', async () => {
      await expect(page.getByTestId('waffleMap')).toBeVisible();
    });

    await test.step('open and display timeline', async () => {
      const toggleTimelineButton = page.getByTestId('toggleTimelineButton');
      await expect(toggleTimelineButton).toBeVisible();
      await toggleTimelineButton.click();
      await expect(page.getByTestId('timelineContainerOpen')).toBeVisible();
    });

    await test.step('switch to table view and display inventory table', async () => {
      const tableViewButton = page.getByRole('button', { name: 'Table view' });
      await expect(tableViewButton).toBeVisible();
      await tableViewButton.click();
      await expect(page.getByTestId('infraNodesOverviewTable')).toBeVisible();
    });
  });

  test('Render and dismiss k8s tour', async ({ page }) => {
    await test.step('display k8s tour with proper message', async () => {
      const tourText = page.getByTestId('infra-kubernetesTour-text');
      await expect(tourText).toBeVisible();
      await expect(tourText).toHaveText(
        'Click here to see your infrastructure in different ways, including Kubernetes pods.'
      );
    });

    await test.step('dismiss k8s tour', async () => {
      const dismissButton = page.getByTestId('infra-kubernetesTour-dismiss');
      await expect(dismissButton).toBeVisible();
      await dismissButton.click();
      await expect(page.getByTestId('infra-kubernetesTour-text')).toBeHidden();
    });

    await test.step('reload page and verify tour remains dismissed', async () => {
      await page.reload();
      await page.getByTestId('infraMetricsPage').waitFor();
      await page.getByTestId('infraNodesOverviewLoadingPanel').waitFor({ state: 'hidden' });
      await expect(page.getByTestId('infra-kubernetesTour-text')).toBeHidden();
    });
  });
});
