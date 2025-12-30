/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Infrastructure Inventory - Sequential', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await inventoryPage.goToPage();
  });

  test('Renders no data page and redirects to onboarding page when no data is present', async ({
    page,
    pageObjects: { inventoryPage },
  }) => {
    await test.step('display empty state', async () => {
      await expect(inventoryPage.noDataPage).toBeVisible();
      await expect(inventoryPage.noDataPageActionButton).toBeVisible();
    });

    await test.step('redirect to onboarding page when clicking on the add data button', async () => {
      await inventoryPage.clickNoDataPageAddDataButton();
      const url = new URL(page.url());
      expect(url.pathname).toContain('/app/observabilityOnboarding');
    });
  });
});
