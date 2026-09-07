/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe(
  'Infrastructure Inventory - Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects: { inventoryPage } }) => {
      await test.step('mock metrics has-data response', async () => {
        await page.route(
          (url) => url.pathname.includes('/api/metrics/source/hasData'),
          (route) =>
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ hasData: false }),
            })
        );
      });

      await test.step('log in as viewer', async () => {
        await browserAuth.loginAsViewer();
      });

      await test.step('navigate to inventory and wait for has-data request', async () => {
        const hasDataResponse = page.waitForResponse(
          (response) => response.url().includes('/api/metrics/source/hasData'),
          { timeout: EXTENDED_TIMEOUT }
        );
        // Skip full page load assertion; onboarding replaces inventory content after `/api/metrics/source/hasData`.
        await inventoryPage.goToPage({ skipLoadWait: true });
        await hasDataResponse;
      });
    });

    test('Renders no data page and redirects to onboarding page when no data is present', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await test.step('display empty state', async () => {
        await inventoryPage.waitForOnboardingNoDataPage();
        await expect(inventoryPage.noDataPage).toBeVisible();
        await expect(inventoryPage.noDataPageActionButton).toBeVisible();
      });

      await test.step('redirect to onboarding page when clicking on the add data button', async () => {
        await inventoryPage.clickNoDataPageAddDataButton();
        await expect(page.getByTestId('obltOnboardingHomeTitle')).toBeVisible();
      });
    });
  }
);
