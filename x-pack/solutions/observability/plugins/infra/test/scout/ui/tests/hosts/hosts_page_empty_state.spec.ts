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
  'Hosts Page - Empty State',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects: { hostsPage } }) => {
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

      await test.step('navigate to hosts and wait for has-data request', async () => {
        const hasDataResponse = page.waitForResponse(
          (response) => response.url().includes('/api/metrics/source/hasData'),
          { timeout: EXTENDED_TIMEOUT }
        );
        await hostsPage.goToHostsPage({ skipLoadWait: true });
        await hasDataResponse;
      });
    });

    test('should show onboarding page when no data is present', async ({
      page,
      pageObjects: { hostsPage },
    }) => {
      await test.step('display empty state', async () => {
        await expect(hostsPage.noDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(hostsPage.noDataPageActionButton).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('redirect to onboarding page when clicking on the add data button', async () => {
        await hostsPage.clickNoDataPageAddDataButton();
        await expect(page.getByTestId('obltOnboardingHomeTitle')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });
  }
);
