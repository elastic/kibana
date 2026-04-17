/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4, v7 } from 'uuid';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
/** Matches @kbn/slo-plugin common/constants HEALTH_DATA_STREAM_NAME */
const HEALTH_DATA_STREAM_NAME = '.slo-observability.health-v3.6';
import { test } from '../fixtures';

/** Exceeds scan results panel PAGE_SIZE (25) so pagination controls appear */
const PROBLEMATIC_COUNT = 30;
const TEST_SCAN_ID = v7();

test.describe(
  'Health Scan pagination',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, sloData }) => {
      await sloData.addSLO();

      const docs = Array.from({ length: PROBLEMATIC_COUNT }, (_, i) => ({
        '@timestamp': new Date(Date.now() - i * 1000).toISOString(),
        scanId: TEST_SCAN_ID,
        spaceId: 'default',
        slo: {
          id: v4(),
          revision: 1,
          name: `Problematic SLO ${i + 1}`,
          enabled: true,
        },
        health: {
          isProblematic: true,
          rollup: {
            isProblematic: true,
            missing: true,
            status: 'unavailable',
            state: 'unavailable',
          },
          summary: {
            isProblematic: false,
            missing: false,
            status: 'healthy',
            state: 'started',
            stateMatches: true,
          },
        },
      }));

      const operations = docs.flatMap((doc) => [
        { create: { _index: HEALTH_DATA_STREAM_NAME } },
        doc,
      ]);

      await esClient.bulk({ operations, refresh: true });
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: HEALTH_DATA_STREAM_NAME,
        query: { term: { scanId: TEST_SCAN_ID } },
        refresh: true,
        ignore_unavailable: true,
      });
    });

    test('paginates through health scan results and shows correct content per page', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.slo.gotoManagement();

      await test.step('Open health scan flyout', async () => {
        await pageObjects.slo.openHealthScanFlyout();
      });

      await test.step('Open results for seeded scan', async () => {
        await expect(page.getByTestId(`healthScanViewResults-${TEST_SCAN_ID}`)).toBeVisible({
          timeout: 15000,
        });
        await page.getByTestId(`healthScanViewResults-${TEST_SCAN_ID}`).click();
      });

      await test.step('First page shows correct range and first-page content', async () => {
        const resultsTable = page.getByTestId('healthScanResultsTable');
        await expect(resultsTable).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(`Showing 1-25 of ${PROBLEMATIC_COUNT}`)).toBeVisible();
        await expect(
          resultsTable.getByRole('link', { name: /Problematic SLO 1(?!\d)/ })
        ).toBeVisible();
        await expect(
          resultsTable.getByRole('link', { name: /Problematic SLO 25(?!\d)/ })
        ).toBeVisible();
      });

      await test.step('Previous button is disabled on first page', async () => {
        await expect(pageObjects.slo.getPreviousPageButton()).toBeDisabled();
      });

      await test.step('Click Next and verify second page content', async () => {
        await expect(pageObjects.slo.getNextPageButton()).toBeEnabled({ timeout: 15000 });
        await pageObjects.slo.clickNextPage();
        const resultsTable = page.getByTestId('healthScanResultsTable');
        await expect(
          page.getByText(`Showing 26-${PROBLEMATIC_COUNT} of ${PROBLEMATIC_COUNT}`)
        ).toBeVisible();
        await expect(
          resultsTable.getByRole('link', { name: /Problematic SLO 26(?!\d)/ })
        ).toBeVisible();
        await expect(
          resultsTable.getByRole('link', { name: /Problematic SLO 30(?!\d)/ })
        ).toBeVisible();
      });

      await test.step('Next button is disabled on last page', async () => {
        await expect(pageObjects.slo.getNextPageButton()).toBeDisabled();
      });

      await test.step('Click Previous and return to first page', async () => {
        await pageObjects.slo.clickPreviousPage();
        const resultsTable = page.getByTestId('healthScanResultsTable');
        await expect(page.getByText(`Showing 1-25 of ${PROBLEMATIC_COUNT}`)).toBeVisible();
        await expect(
          resultsTable.getByRole('link', { name: /Problematic SLO 1(?!\d)/ })
        ).toBeVisible();
      });
    });
  }
);
