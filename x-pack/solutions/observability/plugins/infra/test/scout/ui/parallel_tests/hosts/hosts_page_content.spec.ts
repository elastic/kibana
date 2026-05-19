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
  HOSTS,
  HOST1_NAME,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  EXTENDED_TIMEOUT,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Content',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        preferredSchema: 'ecs',
      });

      await test.step('wait for table and KPIs to load', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.waitForKPILoadingToFinish(EXTENDED_TIMEOUT);
      });
    });

    test('should render the correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Hosts - Infrastructure - Observability - Elastic/);
    });

    test('should maintain the selected date range when navigating to host details', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await test.step('click a host link to navigate to host details', async () => {
        const hostLink = hostsPage.getHostDetailLinks();
        await expect(hostLink).not.toHaveCount(0);
        const linkRow = hostsPage.getHostRow(HOST1_NAME);
        await linkRow.getByTestId('hostsViewTableEntryTitleLink').click();
      });

      await test.step('verify the date picker preserves the selected time range', async () => {
        const datePicker = page.getByTestId('superDatePickerstartDatePopoverButton');
        await expect(datePicker).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(datePicker).toContainText('Mar 28, 2023');
      });
    });

    test('should load 11 lens metric charts in the Metrics tab', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await hostsPage.visitMetricsTab();

      await test.step('verify 11 metric charts are rendered', async () => {
        const charts = hostsPage.getMetricsCharts();
        await expect(charts).toHaveCount(11, { timeout: EXTENDED_TIMEOUT });
      });

      await test.step('verify the Lens action menu is available', async () => {
        await hostsPage.clickMetricChartAction('hostsView-metricChart-tx');
        await expect(page.getByTestId('embeddablePanelAction-openInLens')).toBeVisible();
        await page.keyboard.press('Escape');
      });
    });

    test('should load the Logs tab with embedded saved search', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await hostsPage.visitLogsTab();

      await test.step('verify the embedded saved search table is visible', async () => {
        await expect(page.getByTestId('embeddedSavedSearchDocTable')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('verify the correct column headers', async () => {
        const table = page.getByTestId('embeddedSavedSearchDocTable');
        await expect(table.getByRole('columnheader', { name: '@timestamp' })).toBeVisible();
        await expect(table.getByRole('columnheader', { name: 'Summary' })).toBeVisible();
      });
    });
  }
);
