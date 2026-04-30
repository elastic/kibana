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
  HOST2_NAME,
  HOST3_NAME,
  HOST5_NAME,
  HOST6_NAME,
  HOSTS,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  KPI_RENDER_TIMEOUT,
} from '../../fixtures/constants';

const EXPECTED_HOST_COUNT = HOSTS.length;

test.describe(
  'Hosts Page - Table',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      // The hosts table suite waits on Lens + elastic-charts KPI rendering in
      // beforeEach; under CI contention first-load timing exceeds Scout's 60s
      // default. Extend the budget to 180s.
      test.setTimeout(180_000);
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        preferredSchema: 'ecs',
      });

      await test.step('wait for table and KPIs to load', async () => {
        await expect(hostsPage.tableRows).toHaveCount(EXPECTED_HOST_COUNT);
        await hostsPage.waitForKPILoadingToFinish(KPI_RENDER_TIMEOUT);
      });
    });

    test('should render a table with the correct number of hosts', async ({
      pageObjects: { hostsPage },
    }) => {
      await expect(hostsPage.tableRows).toHaveCount(EXPECTED_HOST_COUNT);
    });

    test('should render metric values for each host entry', async ({
      pageObjects: { hostsPage },
    }) => {
      for (const host of HOSTS) {
        const row = hostsPage.getHostRow(host.hostName);
        await expect(row).toBeVisible();
        const rowData = hostsPage.getRowDataLocators(row);
        await expect(rowData.title).toHaveText(host.hostName);
        await expect(rowData.cpuUsage).not.toHaveText('');
        await expect(rowData.cpuUsage).not.toHaveText('N/A');
      }
    });

    test('should select and filter hosts inside the table', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await test.step('verify selected hosts button is not visible initially', async () => {
        await expect(hostsPage.selectedHostsFilterButton).toBeHidden();
      });

      await test.step('select two hosts via checkboxes', async () => {
        await hostsPage.clickHostCheckbox(HOST1_NAME, 'Linux');
        await hostsPage.clickHostCheckbox(HOST2_NAME, 'Linux');
        await expect(hostsPage.selectedHostsFilterButton).toBeVisible();
      });

      await test.step('apply the selected hosts filter', async () => {
        await hostsPage.clickSelectedHostsButton();
        await hostsPage.clickAddFilterButton();
        await expect(hostsPage.tableRows).toHaveCount(2);
      });

      await test.step('remove the filter and verify all hosts return', async () => {
        const deleteFilterButton = page.locator(
          `[title="Delete host.name: ${HOST1_NAME} OR host.name: ${HOST2_NAME}"]`
        );
        await deleteFilterButton.click();
        await expect(hostsPage.tableRows).toHaveCount(EXPECTED_HOST_COUNT);
      });
    });

    test('should display correct KPI tile values', async ({ pageObjects: { hostsPage } }) => {
      await test.step('verify hosts count KPI', async () => {
        await expect(hostsPage.getKPITileValueLocator('hostsCount')).toHaveAttribute(
          'title',
          String(EXPECTED_HOST_COUNT)
        );
      });

      const kpiTiles = ['cpuUsage', 'memoryUsage', 'normalizedLoad1m', 'diskUsage'];

      await hostsPage.waitForHostKPIChartsToLoad(kpiTiles, KPI_RENDER_TIMEOUT);

      for (const metric of kpiTiles) {
        await test.step(`verify ${metric} KPI is present`, async () => {
          await expect(hostsPage.getHostKPIChartValueLocator(metric)).toHaveAttribute(
            'title',
            /.+/
          );
        });
      }
    });

    test('should paginate to 5 rows per page and navigate to the last page', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('change page size to 5', async () => {
        await hostsPage.changePageSize(5);
        await expect(hostsPage.tableRows).toHaveCount(5);
      });

      await test.step('navigate to the second page and verify 1 row', async () => {
        await hostsPage.paginateTo(2);
        await expect(hostsPage.tableRows).toHaveCount(1);
      });
    });

    test('should show all hosts when page size is increased', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('change page size to 5 first', async () => {
        await hostsPage.changePageSize(5);
        await expect(hostsPage.tableRows).toHaveCount(5);
      });

      await test.step('change page size to 10 and verify all hosts', async () => {
        await hostsPage.changePageSize(10);
        await expect(hostsPage.tableRows).toHaveCount(EXPECTED_HOST_COUNT);
      });
    });

    test('should sort by CPU usage ascending', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.changePageSize(5);

      await test.step('sort ascending and verify lowest CPU host is on first page', async () => {
        await hostsPage.sortByCpuUsage();
        const lowestCpuRow = hostsPage.getHostRow(HOST5_NAME);
        await expect(lowestCpuRow).toBeVisible();
      });

      await test.step('navigate to last page and verify highest CPU host', async () => {
        await hostsPage.paginateTo(2);
        const highestCpuRow = hostsPage.getHostRow(HOST3_NAME);
        await expect(highestCpuRow).toBeVisible();
      });
    });

    test('should sort by CPU usage descending', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.changePageSize(5);

      await test.step('sort descending and verify highest CPU host is on first page', async () => {
        await hostsPage.sortByCpuUsage();
        await hostsPage.sortByCpuUsage();
        const highestCpuRow = hostsPage.getHostRow(HOST3_NAME);
        await expect(highestCpuRow).toBeVisible();
      });

      await test.step('navigate to last page and verify lowest CPU host', async () => {
        await hostsPage.paginateTo(2);
        const lowestCpuRow = hostsPage.getHostRow(HOST5_NAME);
        await expect(lowestCpuRow).toBeVisible();
      });
    });

    test('should sort by title ascending', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.changePageSize(5);

      await test.step('sort ascending and verify host-1 is on first page', async () => {
        await hostsPage.sortByTitle();
        const firstHostRow = hostsPage.getHostRow(HOST1_NAME);
        await expect(firstHostRow).toBeVisible();
      });

      await test.step('navigate to last page and verify host-6', async () => {
        await hostsPage.paginateTo(2);
        const lastHostRow = hostsPage.getHostRow(HOST6_NAME);
        await expect(lastHostRow).toBeVisible();
      });
    });

    test('should sort by title descending', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.changePageSize(5);

      await test.step('sort descending and verify host-6 is on first page', async () => {
        await hostsPage.sortByTitle();
        await hostsPage.sortByTitle();
        const lastHostRow = hostsPage.getHostRow(HOST6_NAME);
        await expect(lastHostRow).toBeVisible();
      });

      await test.step('navigate to last page and verify host-1', async () => {
        await hostsPage.paginateTo(2);
        const firstHostRow = hostsPage.getHostRow(HOST1_NAME);
        await expect(firstHostRow).toBeVisible();
      });
    });
  }
);
