/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import {
  disableAssetInventory,
  enableAssetInventory,
  enableAssetInventoryApiCall,
  postDataView,
  createAssetInventoryMapping,
  createMockAsset,
} from '../../common/api_helpers';

test.describe(
  'Asset Inventory page - uiSetting disabled',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await disableAssetInventory(kbnClient);
      await pageObjects.assetInventory.goto();
    });

    test('should navigate user to Security welcome when asset inventory is not enabled', async ({
      page,
    }) => {
      await expect(page).toHaveURL(/security\/get_started/);
    });
  }
);

test.describe('Asset Inventory page - user flyout', { tag: [...tags.stateful.classic] }, () => {
  const indexName = 'logs-cba';

  test.beforeAll(async ({ kbnClient, esClient }) => {
    await postDataView(
      kbnClient,
      'logs*',
      'security-solution-default',
      'security-solution-default'
    );
    await enableAssetInventory(kbnClient);
    await enableAssetInventoryApiCall(kbnClient);
    await createAssetInventoryMapping(esClient, indexName);
    await createMockAsset(esClient, indexName);
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.assetInventory.goto();
    await page.route('**/api/asset_inventory/status', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      if (body.status === 'ready') {
        return route.fulfill({ response });
      }
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'ready' }),
      });
    });
    await page.reload();
    await page.testSubj.locator('allAssetsTitle').waitFor({ state: 'visible', timeout: 30_000 });
  });

  test('should display All assets title', async ({ pageObjects }) => {
    await expect(pageObjects.assetInventory.noPrivilegesBox.first()).not.toBeAttached();
    await expect(pageObjects.assetInventory.allAssetsTitle.first()).toBeVisible();
  });

  test('renders data grid', async ({ pageObjects, page }) => {
    await expect(pageObjects.assetInventory.dataGridColumnSelector.first()).toBeVisible();
    await expect(pageObjects.assetInventory.dataGridSorting.first()).toBeVisible();
    await expect(page.getByText('4 assets').first()).toBeVisible();
    await expect(pageObjects.assetInventory.dataGridHeader.first()).toContainText('Name');
    await expect(pageObjects.assetInventory.dataGridHeader.first()).toContainText('ID');
    await expect(pageObjects.assetInventory.dataGridHeader.first()).toContainText('Type');
    await expect(pageObjects.assetInventory.dataGridHeader.first()).toContainText('Last Seen');
  });
});
