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
  BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
  CONTAINER_COUNT,
  CONTAINER_IDS,
  CONTAINER_NAMES,
  DATE_WITH_DOCKER_DATA_TIMESTAMP,
  DEFAULT_CONTAINERS_INVENTORY_VIEW_NAME,
  EXTENDED_TIMEOUT,
  LOG_LEVELS,
} from '../../fixtures/constants';

const CONTAINER_NAME = CONTAINER_NAMES[CONTAINER_COUNT - 1];
const CONTAINER_ID = CONTAINER_IDS[CONTAINER_COUNT - 1];

test.describe(
  'Infrastructure Inventory - Container Asset Details Flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let savedViewId: string = '';

    test.beforeAll(async ({ apiServices: { inventoryViews } }) => {
      const createResult = await inventoryViews.create({
        ...BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
        name: DEFAULT_CONTAINERS_INVENTORY_VIEW_NAME,
        nodeType: 'container',
        time: DATE_WITH_DOCKER_DATA_TIMESTAMP,
        metric: {
          type: 'cpu',
        },
      });

      savedViewId = createResult.id;
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPageWithSavedViewAndAssetDetailsFlyout({
        savedViewId,
        assetId: CONTAINER_ID,
        entityType: 'container',
      });
    });

    test.afterAll(async ({ apiServices: { inventoryViews } }) => {
      await inventoryViews.deleteById(savedViewId);
    });

    test('opens on the overview tab with the container KPIs, metadata and metrics sections', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      await expect(assetDetailsPage.dockerOverviewTab.tab).toHaveAttribute(
        'aria-selected',
        'true',
        { timeout: EXTENDED_TIMEOUT }
      );

      await expect(
        assetDetailsPage.dockerOverviewTab.kpiCpuUsageChart.getByRole('heading', {
          name: 'CPU Usage',
        })
      ).toBeVisible();
      await expect(assetDetailsPage.dockerOverviewTab.metadataSection).toBeVisible();
      await expect(assetDetailsPage.dockerOverviewTab.metricsSection).toBeVisible();
    });

    test('opens the filtered container logs query in Discover', async ({
      page,
      pageObjects: { assetDetailsPage },
    }) => {
      await test.step('go to the logs tab', async () => {
        await expect(assetDetailsPage.logsTag.tab).toBeVisible({ timeout: EXTENDED_TIMEOUT });
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

      await test.step('carry the container and log filters over to Discover', async () => {
        const discoverQuery = `(container.id: ${CONTAINER_ID}) and ("${LOG_LEVELS[0].message}")`;

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
        await expect(assetDetailsPage.metadataTab.tab).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('open asset details as page keeping the selected tab', async () => {
        await assetDetailsPage.openAsPageButton.click();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();

        const url = new URL(page.url());
        expect(url.pathname).toBe(
          `/app/metrics/detail/container/${encodeURIComponent(CONTAINER_ID)}`
        );
      });

      await test.step('return to flyout from asset details page', async () => {
        await expect(assetDetailsPage.returnButton).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await assetDetailsPage.returnButton.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: CONTAINER_NAME })
        ).toBeVisible();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();
      });
    });
  }
);
