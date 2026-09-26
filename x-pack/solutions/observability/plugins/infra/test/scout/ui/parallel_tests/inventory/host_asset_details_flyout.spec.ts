/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  HOST1_NAME,
  LOG_LEVELS,
  EXTENDED_TIMEOUT,
  DEFAULT_HOSTS_INVENTORY_VIEW_NAME,
  BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
  DATE_WITH_HOSTS_DATA_TIMESTAMP,
} from '../../fixtures/constants';

test.describe(
  'Infrastructure Inventory - Host Asset Details Flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let savedViewId: string = '';

    test.beforeAll(async ({ apiServices: { inventoryViews } }) => {
      const createResult = await inventoryViews.create({
        ...BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
        name: DEFAULT_HOSTS_INVENTORY_VIEW_NAME,
        nodeType: 'host',
        time: DATE_WITH_HOSTS_DATA_TIMESTAMP,
        metric: {
          type: 'cpuV2',
        },
      });

      savedViewId = createResult.id;
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPageWithSavedViewAndAssetDetailsFlyout({
        savedViewId,
        assetId: HOST1_NAME,
        entityType: 'host',
      });
    });

    test.afterAll(async ({ apiServices: { inventoryViews } }) => {
      await inventoryViews.deleteById(savedViewId);
    });

    test('opens on the overview tab with the host KPIs, metadata and metrics sections', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      await expect(assetDetailsPage.hostOverviewTab.tab).toHaveAttribute('aria-selected', 'true');

      await expect(
        assetDetailsPage.hostOverviewTab.kpiCpuUsageChart.getByRole('heading', {
          name: 'CPU Usage',
        })
      ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(assetDetailsPage.hostOverviewTab.metadataSection).toBeVisible();
      await expect(assetDetailsPage.hostOverviewTab.metricsSection).toBeVisible();
    });

    test('opens the filtered host logs query in Discover', async ({
      page,
      pageObjects: { assetDetailsPage },
    }) => {
      await test.step('go to the logs tab', async () => {
        await assetDetailsPage.logsTag.clickTab();
        await expect(assetDetailsPage.logsTag.table).toBeVisible();
      });

      await test.step('filter logs via search bar', async () => {
        const totalDocumentsText =
          await assetDetailsPage.logsTag.tableTotalDocumentsLabel.textContent();

        await assetDetailsPage.logsTag.filterTable(`"${LOG_LEVELS[0].message}"`);
        await expect(assetDetailsPage.logsTag.tableTotalDocumentsLabel).not.toHaveText(
          totalDocumentsText!
        );
      });

      await test.step('carry the host and log filters over to Discover', async () => {
        const discoverQuery = `(host.name: ${HOST1_NAME}) and ("${LOG_LEVELS[0].message}")`;

        await assetDetailsPage.logsTag.openInDiscoverButton.click();

        // Giving extended timeout to ensure Discover has enough time to load the page
        await expect(page.getByTestId('queryInput')).toHaveValue(discoverQuery, {
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });

    test('opens the flyout as a full page and returns to it keeping the selected tab', async ({
      page,
      pageObjects: { assetDetailsPage },
    }) => {
      await test.step('go to metadata tab', async () => {
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('open asset details as page keeping the selected tab', async () => {
        await assetDetailsPage.openAsPageButton.click();

        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();

        const url = new URL(page.url());
        expect(url.pathname).toBe(`/app/metrics/detail/host/${encodeURIComponent(HOST1_NAME)}`);
      });

      await test.step('return to flyout from asset details page', async () => {
        await expect(assetDetailsPage.returnButton).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await assetDetailsPage.returnButton.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: HOST1_NAME })
        ).toBeVisible();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();
      });
    });
  }
);
