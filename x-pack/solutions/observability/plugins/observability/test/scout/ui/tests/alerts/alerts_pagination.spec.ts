/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { ALERT_STATUS_CONTROL_ID } from '../../fixtures/constants';
import { generateObservabilityAlerts } from '../../fixtures/alerts_data';

const PAGE_SIZE = 10;

// Ported from the FTR `Observability alerts pagination` suite
// (x-pack/solutions/observability/test/observability_functional/apps/observability/pages/alerts/pagination.ts).
// The skipped `When less than 10 alerts are found` block (#119946) is dropped.
test.describe('Observability alerts - pagination', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await generateObservabilityAlerts(esClient);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.alertsTablePage.goto();
  });

  test('exposes the page size selector and applies the selected size', async ({ pageObjects }) => {
    const { alertsTablePage } = pageObjects;

    await test.step('renders the page size selector defaulting to 50 rows', async () => {
      await expect(alertsTablePage.pageSizeButton).toBeVisible();
      await expect(alertsTablePage.pageSizeButton).toContainText('50');
    });

    await test.step('shows up to 10 rows per page', async () => {
      await alertsTablePage.setPageSize(10);
      await expect.poll(() => alertsTablePage.dataGrid.getRowsCount()).toBeLessThanOrEqual(10);
    });

    await test.step('shows up to 20 rows per page', async () => {
      await alertsTablePage.setPageSize(20);
      await expect.poll(() => alertsTablePage.dataGrid.getRowsCount()).toBeLessThanOrEqual(20);
    });
  });

  test('navigates between pages', async ({ pageObjects }) => {
    const { alertsTablePage, alertControls } = pageObjects;

    await test.step('paginates the 30 recovered alerts into pages of 10', async () => {
      // Clear the default "active" selection first so only recovered alerts
      // remain (30 -> 3 pages of 10), then narrow to a 10-row page size.
      await alertControls.clearControlSelections(ALERT_STATUS_CONTROL_ID);
      await alertsTablePage.waitForTableToLoad();
      await alertControls.openOptionsListPopover(ALERT_STATUS_CONTROL_ID);
      await alertControls.selectOption('recovered');
      await alertControls.ensurePopoverIsClosed(ALERT_STATUS_CONTROL_ID);
      await alertsTablePage.waitForTableToLoad();
      await alertsTablePage.setPageSize(10);
    });

    await test.step('disables the previous-page button on the first page', async () => {
      await expect(alertsTablePage.prevPageButton).toBeVisible();
      await expect(alertsTablePage.nextPageButton).toBeVisible();
      await expect(alertsTablePage.prevPageButton).toBeDisabled();
    });

    await test.step('jumps to a numbered page', async () => {
      await alertsTablePage.goToPage(2);
      await expect.poll(() => alertsTablePage.dataGrid.getRowsCount()).toBe(PAGE_SIZE);
    });

    await test.step('moves to the next page', async () => {
      await alertsTablePage.goToNextPage();
      await expect.poll(() => alertsTablePage.dataGrid.getRowsCount()).toBe(PAGE_SIZE);
    });

    await test.step('moves back to the previous page', async () => {
      await alertsTablePage.goToPrevPage();
      await expect.poll(() => alertsTablePage.dataGrid.getRowsCount()).toBe(PAGE_SIZE);
    });
  });
});
