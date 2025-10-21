/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

test.describe('Storage explorer page', { tag: ['@ess'] }, () => {
  const { rangeFrom, rangeTo } = testData.PROFILING_TEST_DATES;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('loads storage explorer with real data', async ({
    pageObjects: { profilingStorageExplorerPage },
  }) => {
    await profilingStorageExplorerPage.gotoWithTimeRange(rangeFrom, rangeTo);
    await expect(
      profilingStorageExplorerPage.page
        .getByTestId('profilingPageTemplate')
        .getByText('Storage explorer')
    ).toBeVisible();
  });

  test('Host agent breakdown tab displays host agent details', async ({
    pageObjects: { profilingStorageExplorerPage },
  }) => {
    await profilingStorageExplorerPage.gotoWithTimeRange(rangeFrom, rangeTo);

    const firstRowProbabilisticValues = profilingStorageExplorerPage.page
      .getByTestId('profilingStorageExplorerHostsTable')
      .getByRole('cell', { name: '3145700' });
    await expect(firstRowProbabilisticValues).toContainText('3145700');
    await expect(
      profilingStorageExplorerPage.page.getByTestId('hostId_8457605156473051743')
    ).toContainText('[8457605156473051743]');
    await expect(
      profilingStorageExplorerPage.page.getByTestId('hostId_8457605156473051743')
    ).toHaveAttribute(
      'href',
      `/app/profiling/flamegraphs/flamegraph?kuery=host.id%3A%20%228457605156473051743%22&rangeFrom=${encodeURIComponent(
        rangeFrom
      )}&rangeTo=${encodeURIComponent(rangeTo)}`
    );
  });

  test('Summary stats tab will still load with kuery', async ({
    pageObjects: { profilingStorageExplorerPage },
  }) => {
    await profilingStorageExplorerPage.gotoWithTimeRange(rangeFrom, rangeTo, 'host.id : "1234"');
    await expect(
      profilingStorageExplorerPage.page
        .getByTestId('profilingPageTemplate')
        .getByText('Storage explorer')
    ).toBeVisible();
  });

  test('Data breakdown tab displays correct values per index', async ({
    pageObjects: { profilingStorageExplorerPage },
  }) => {
    await profilingStorageExplorerPage.gotoWithTimeRange(rangeFrom, rangeTo);

    await profilingStorageExplorerPage.page.getByTestId('storageExplorer_dataBreakdownTab').click();
    await expect(profilingStorageExplorerPage.page.getByText('Indices breakdown')).toBeVisible();

    const indexData = [
      { indexName: 'stackframes', docSize: '7,616' },
      { indexName: 'stacktraces', docSize: '2,217' },
      { indexName: 'executables', docSize: '85' },
      { indexName: 'metrics', docSize: '0' },
      { indexName: 'events', docSize: '3,242' },
    ];

    for (const { indexName, docSize } of indexData) {
      await expect(
        profilingStorageExplorerPage.page.getByTestId(`${indexName}_docSize`)
      ).toContainText(docSize);
    }
  });
});
