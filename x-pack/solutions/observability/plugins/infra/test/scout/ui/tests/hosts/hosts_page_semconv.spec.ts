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
  SEMCONV_HOSTS,
  SEMCONV_HOST1_NAME,
  DATE_WITH_SEMCONV_DATA_FROM,
  DATE_WITH_SEMCONV_DATA_TO,
  EXTENDED_TIMEOUT,
  KPI_RENDER_TIMEOUT,
} from '../../fixtures/constants';
import {
  cleanSemconvHostsSynthtraceData,
  ingestSemconvHostsSynthtraceData,
} from '../../fixtures/sequential_hosts_synthtrace';

test.describe(
  'Hosts Page - OTel Semconv Data',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: ingesting semconv host metrics');
      await ingestSemconvHostsSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      // Semconv KPI + flyout suites rely on Lens + elastic-charts rendering
      // on top of the OTel data stream; first-load timing in CI exceeds
      // Scout's 60s default. Now that this spec runs sequentially, a smaller
      // budget is sufficient while still covering first-render variance.
      test.setTimeout(120_000);
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_SEMCONV_DATA_FROM,
        to: DATE_WITH_SEMCONV_DATA_TO,
        preferredSchema: 'semconv',
      });
      await expect(hostsPage.tableRows).toHaveCount(SEMCONV_HOSTS.length);
    });

    test.afterEach(() => {
      // `playwright/prefer-hooks-in-order`: `afterEach` before `afterAll`.
    });

    test.afterAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: cleaning semconv host metrics');
      await cleanSemconvHostsSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test('should display semconv hosts in the table', async ({ pageObjects: { hostsPage } }) => {
      await test.step('verify host count KPI', async () => {
        await expect(hostsPage.kpiGrid.getByTestId('hostsViewKPI-hostsCount')).toContainText(
          String(SEMCONV_HOSTS.length)
        );
      });

      await test.step('verify all semconv hosts are listed', async () => {
        for (const host of SEMCONV_HOSTS) {
          await expect(hostsPage.getHostRow(host.hostName)).toBeVisible();
        }
      });
    });

    test('should display KPI metrics for semconv data', async ({ pageObjects: { hostsPage } }) => {
      const kpiTiles = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];

      await hostsPage.waitForHostKPIChartsToLoad(kpiTiles, KPI_RENDER_TIMEOUT);

      for (const metric of kpiTiles) {
        await test.step(`verify ${metric} KPI tile has a value`, async () => {
          await expect(hostsPage.getHostKPIChartValueLocator(metric)).toHaveAttribute(
            'title',
            /.+/
          );
        });
      }
    });

    test('should show metric values in table rows (not N/A)', async ({
      pageObjects: { hostsPage },
    }) => {
      const metricCells = [
        'hostsView-tableRow-cpuUsage',
        'hostsView-tableRow-normalizedLoad1m',
        'hostsView-tableRow-memoryUsage',
        'hostsView-tableRow-memoryFree',
        'hostsView-tableRow-diskSpaceUsage',
      ];

      for (const host of SEMCONV_HOSTS) {
        await test.step(`verify ${host.hostName} has metric values`, async () => {
          const row = hostsPage.getHostRow(host.hostName);

          for (const cellTestId of metricCells) {
            const cell = hostsPage.getCellContentLocator(row, cellTestId);
            await expect(cell).not.toHaveText('N/A');
            await expect(cell).not.toHaveText('');
          }
        });
      }
    });

    test('should hide rx and tx columns for semconv data', async ({ page }) => {
      await expect(page.getByTestId('hostsView-tableRow-rx')).toHaveCount(0);
      await expect(page.getByTestId('hostsView-tableRow-tx')).toHaveCount(0);
    });

    test('should open flyout for a semconv host', async ({
      pageObjects: { hostsPage, assetDetailsPage },
    }) => {
      await hostsPage.openHostFlyout(SEMCONV_HOST1_NAME);

      await test.step('verify overview tab loads with KPI charts', async () => {
        await expect(assetDetailsPage.hostOverviewTab.kpiGrid).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(
          assetDetailsPage.hostOverviewTab.getKPIEmbeddableError('cpuUsage')
        ).toHaveCount(0);
      });
    });
  }
);
