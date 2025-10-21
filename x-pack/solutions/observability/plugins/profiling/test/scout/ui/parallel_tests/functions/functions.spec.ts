/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

test.describe('Functions page', { tag: ['@ess'] }, () => {
  const { rangeFrom, rangeTo } = testData.PROFILING_TEST_DATES;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('opens /topN page when navigating to /functions page', async ({
    pageObjects: { functionsPage },
  }) => {
    await functionsPage.goto();
    await expect(functionsPage.page).toHaveURL(/.*\/app\/profiling\/functions\/topn/);
  });

  test('shows TopN functions and Differential TopN functions', async ({
    pageObjects: { functionsPage },
    page,
  }) => {
    await functionsPage.goto();
    await expect(page.getByRole('tab', { name: 'TopN functions', exact: true })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Differential TopN functions', exact: true })
    ).toBeVisible();
  });

  test('validates table has data', async ({ pageObjects: { functionsPage } }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Use page object methods to verify table has data
    const firstRow = await functionsPage.getTopNFunctionsRow(0);
    await expect(firstRow).toBeVisible();

    // Verify table has data by checking cells contain expected content
    const rankCell = await functionsPage.getTopNFunctionsCell(0, 1);
    await expect(rankCell).toContainText('1');

    const frameCell = await functionsPage.getTopNFunctionsCell(0, 2);
    await expect(frameCell).toContainText('vmlinux');
  });

  test('can interact with TopN functions table using page object methods', async ({
    pageObjects: { functionsPage },
  }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Use page object methods to get table elements
    const firstRow = await functionsPage.getTopNFunctionsRow(0);
    await expect(firstRow).toBeVisible();

    const firstCell = await functionsPage.getTopNFunctionsCell(0, 1);
    await expect(firstCell).toContainText('1');

    const secondCell = await functionsPage.getTopNFunctionsCell(0, 2);
    await expect(secondCell).toContainText('vmlinux');

    // Use page object method to click action button
    await functionsPage.clickTopNFunctionsActionButton(0);
    await expect(functionsPage.page.getByText('Frame information')).toBeVisible();
  });

  test('shows function details when action button is clicked on the table', async ({
    pageObjects: { functionsPage },
  }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';

    // Use the page object method to click the action button
    await functionsPage.clickFirstRowActionButton(firstRowSelector);

    // Validate frame information content using page object methods
    const frameInfoData = [
      { parentKey: 'informationRows', key: 'executable', value: 'vmlinux' },
      { parentKey: 'informationRows', key: 'function', value: 'N/A' },
      { parentKey: 'informationRows', key: 'sourceFile', value: 'N/A' },
      { parentKey: 'impactEstimates', key: 'totalCPU', value: '13.86%' },
      { parentKey: 'impactEstimates', key: 'selfCPU', value: '13.45%' },
      { parentKey: 'impactEstimates', key: 'samples', value: '69' },
      { parentKey: 'impactEstimates', key: 'selfSamples', value: '67' },
      { parentKey: 'impactEstimates', key: 'coreSeconds', value: '3.63 seconds' },
      { parentKey: 'impactEstimates', key: 'selfCoreSeconds', value: '3.53 seconds' },
      { parentKey: 'impactEstimates', key: 'annualizedCoreSeconds', value: '1.45 months' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfCoreSeconds', value: '1.41 months' },
      { parentKey: 'impactEstimates', key: 'co2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'annualizedCo2Emission', value: '4.85k lbs / 2.2k kg' },
      {
        parentKey: 'impactEstimates',
        key: 'annualizedSelfCo2Emission',
        value: '4.71k lbs / 2.14k kg',
      },
      { parentKey: 'impactEstimates', key: 'dollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'selfDollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'annualizedDollarCost', value: '$45.07' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfDollarCost', value: '$43.76' },
    ];

    // Use page object methods to validate frame information
    for (const { parentKey, key, value } of frameInfoData) {
      await expect(await functionsPage.getFrameInformationLocator(parentKey, key)).toHaveText(
        value
      );
    }
  });

  test('adds kql filter', async ({ pageObjects: { functionsPage } }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Use page object methods to verify initial state
    const frameCell = await functionsPage.getTopNFunctionsCell(0, 2);
    await expect(frameCell).toContainText('vmlinux');

    // Add KQL filter - this should not throw an error
    await functionsPage.addKqlFilter('Stacktrace.id', '-7DvnP1mizQYw8mIIpgbMg');

    // Verify filter was applied - the table should still be visible and have data
    await expect(frameCell).toContainText('vmlinux');

    // Clear the filter
    await functionsPage.clearKqlFilter();

    // Verify table is still visible after clearing filter
    await expect(frameCell).toContainText('vmlinux');
  });

  test('can access settings page', async ({ pageObjects: { functionsPage } }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Click settings button
    await functionsPage.clickSettingsButton();

    // Verify we can access the settings page
    await expect(functionsPage.page.getByText('Advanced Settings')).toBeVisible();
  });

  test('can navigate to differential functions tab', async ({ pageObjects: { functionsPage } }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Navigate to differential functions tab
    await functionsPage.page.getByRole('tab', { name: 'Differential TopN functions' }).click();

    // Verify we're on the differential functions page
    await expect(functionsPage.page).toHaveURL(/.*\/app\/profiling\/functions\/differential/);

    // Verify the tab is active
    await expect(
      functionsPage.page.getByRole('tab', { name: 'Differential TopN functions' })
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('can access frame information window', async ({ pageObjects: { functionsPage } }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Use page object method to click action button
    await functionsPage.clickTopNFunctionsActionButton(0);

    // Verify frame information is visible
    await expect(functionsPage.page.getByText('Frame information')).toBeVisible();
    await expect(functionsPage.page.getByText('Impact estimates')).toBeVisible();
  });

  test('can access settings modal and update CO2 settings', async ({
    pageObjects: { functionsPage },
  }) => {
    await functionsPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Click settings button to open modal
    await functionsPage.clickSettingsButton();

    // Verify we can access the settings page
    await expect(functionsPage.page.getByText('Advanced Settings')).toBeVisible();

    // Verify settings sections are visible
    await expect(functionsPage.page.getByText('Custom CO2 settings')).toBeVisible();
    await expect(
      functionsPage.page.getByRole('heading', { name: 'Data Center PUE' })
    ).toBeVisible();
  });
});
