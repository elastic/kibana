/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe('Differential Functions page', { tag: tags.stateful.classic }, () => {
  const { rangeFrom, rangeTo } = testData.PROFILING_TEST_DATES;
  const comparisonRangeFrom = '2023-04-18T00:01:00.000Z';
  const comparisonRangeTo = '2023-04-18T00:01:30.000Z';

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('show gained performance when comparison data has less samples than baseline', async ({
    pageObjects: { differentialFunctionsPage },
    page,
  }) => {
    await differentialFunctionsPage.gotoDifferentialWithTimeRange(
      rangeFrom,
      rangeTo,
      comparisonRangeFrom,
      comparisonRangeTo
    );

    await expect(page.getByText('Baseline functions')).toBeVisible();
    await expect(page.getByText('Comparison functions')).toBeVisible();

    const overallPerformanceTitle = page.getByTestId('overallPerformance_summary_title');
    await expect(overallPerformanceTitle).toContainText('Gained overall performance by');

    const overallPerformanceValue = await differentialFunctionsPage.getSummaryValue(
      'overallPerformance'
    );
    await expect(overallPerformanceValue).toContainText('66.06%');

    const annualizedCo2Value = await differentialFunctionsPage.getSummaryValue('annualizedCo2');
    await expect(annualizedCo2Value).toContainText('76.06 lbs / 34.5 kg');
    const annualizedCo2Comparison = await differentialFunctionsPage.getSummaryComparisonValue(
      'annualizedCo2'
    );
    await expect(annualizedCo2Comparison).toContainText('25.79 lbs / 11.7 kg (66.09%)');

    const annualizedCostValue = await differentialFunctionsPage.getSummaryValue('annualizedCost');
    await expect(annualizedCostValue).toContainText('$325.27');
    const annualizedCostComparison = await differentialFunctionsPage.getSummaryComparisonValue(
      'annualizedCost'
    );
    await expect(annualizedCostComparison).toContainText('$110.38 (66.06%)');

    const totalSamplesValue = await differentialFunctionsPage.getSummaryValue(
      'totalNumberOfSamples'
    );
    await expect(totalSamplesValue).toContainText('498');
    const totalSamplesComparison = await differentialFunctionsPage.getSummaryComparisonValue(
      'totalNumberOfSamples'
    );
    await expect(totalSamplesComparison).toContainText('169 (66.06%)');
  });

  test('show lost performance when comparison data has more samples than baseline', async ({
    pageObjects: { differentialFunctionsPage },
    page,
  }) => {
    await differentialFunctionsPage.gotoDifferentialWithTimeRange(
      comparisonRangeFrom,
      comparisonRangeTo,
      rangeFrom,
      rangeTo
    );
    const overallPerformanceTitle = page.getByTestId('overallPerformance_summary_title');

    await expect(overallPerformanceTitle).toContainText('Lost overall performance by');

    const summaryItems = [
      { id: 'overallPerformance', value: '194.67%' },
      { id: 'annualizedCo2', value: '25.79 lbs / 11.7 kg' },
      { id: 'annualizedCost', value: '$110.38' },
      { id: 'totalNumberOfSamples', value: '169' },
    ];

    for (const item of summaryItems) {
      const valueLocator = await differentialFunctionsPage.getSummaryValue(item.id);
      await expect(valueLocator).toContainText(item.value);
    }

    const summaryComparisonItems = [
      { id: 'annualizedCo2', value: '76.06 lbs / 34.5 kg (194.87%)' },
      { id: 'annualizedCost', value: '$325.27 (194.67%)' },
      { id: 'totalNumberOfSamples', value: '498 (194.67%)' },
    ];

    for (const item of summaryComparisonItems) {
      const valueLocator = await differentialFunctionsPage.getSummaryComparisonValue(item.id);
      await expect(valueLocator).toContainText(item.value);
    }
  });

  test('adds kql filter', async ({ pageObjects: { differentialFunctionsPage }, page }) => {
    await differentialFunctionsPage.gotoDifferentialWithTimeRange(
      comparisonRangeFrom,
      comparisonRangeTo,
      rangeFrom,
      rangeTo
    );

    await expect(
      page.getByRole('row', { name: 'Show actions 1 metricbeat' }).getByTestId('frame')
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: 'Show actions 2 vmlinux' }).getByTestId('frame')
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: 'Show actions 3 auditbeat' }).getByTestId('frame')
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: 'Show actions 4 dockerd' }).getByTestId('frame')
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: 'Show actions 5 pf-host-agent' }).getByTestId('frame')
    ).toBeVisible();

    await differentialFunctionsPage.addKqlFilterToBaseline(
      'process.thread.name',
      '108795321966692'
    );

    await differentialFunctionsPage.addKqlFilterToComparison(
      'Stacktrace.id',
      '-7DvnP1mizQYw8mIIpgbMg'
    );
    await expect(
      page.getByRole('gridcell', { name: 'libmount.so.1.1.0 libmount.so' }).getByTestId('frame')
    ).toBeVisible();

    const summaryItems = [
      { id: 'overallPerformance', value: '50.00%' },
      { id: 'annualizedCo2', value: '0.22 lbs / 0.1 kg' },
      { id: 'annualizedCost', value: '$1.31' },
      { id: 'totalNumberOfSamples', value: '2' },
    ];

    for (const item of summaryItems) {
      const valueLocator = await differentialFunctionsPage.getSummaryValue(item.id);
      await expect(valueLocator).toContainText(item.value);
    }
  });
});
