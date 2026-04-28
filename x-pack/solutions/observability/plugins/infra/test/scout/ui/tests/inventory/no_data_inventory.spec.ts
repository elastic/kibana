/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { DATE_WITHOUT_DATA, EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe(
  'Infrastructure Inventory - Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.goToPage({ skipLoadWait: true });
      await inventoryPage.goToTime(DATE_WITHOUT_DATA);
    });

    test('Renders no data page and redirects to onboarding page when no data is present', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await test.step('display empty state', async () => {
        await expect(inventoryPage.noDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(inventoryPage.noDataPageActionButton).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('redirect to onboarding page when clicking on the add data button', async () => {
        await inventoryPage.clickHeaderAddDataLink();
        await expect(page.getByTestId('obltOnboardingHomeTitle')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });
  }
);
