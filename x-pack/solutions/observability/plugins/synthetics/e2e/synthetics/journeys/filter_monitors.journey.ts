/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, expect, journey, step, after } from '@elastic/synthetics';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import { SyntheticsServices } from './services/synthetics_services';

const FIRST_TAG = 'a';
const SECOND_TAG = 'b';

journey('FilterMonitors', async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });
  const syntheticsService = new SyntheticsServices(params);
  const retry: RetryService = params.getService('retry');

  before(async () => {
    await syntheticsService.cleanUp();
  });

  after(async () => {
    await syntheticsService.cleanUp();
  });

  step('Go to Monitors overview page', async () => {
    await syntheticsApp.navigateToOverview(true, 15);
  });

  step('Create test monitors', async () => {
    const common = { type: 'http', urls: 'https://www.google.com', locations: ['us_central'] };
    await syntheticsService.addTestMonitor('Test Filter Monitors 1 Tag', {
      ...common,
      tags: [FIRST_TAG],
    });
    await syntheticsService.addTestMonitor('Test Filter Monitors 2 Tags', {
      ...common,
      tags: [FIRST_TAG, SECOND_TAG],
    });
    await page.getByTestId('syntheticsRefreshButtonButton').click();
  });

  step('Filter monitors by tags: use logical AND', async () => {
    let requestMade = false;
    page.on('request', (request) => {
      if (
        request
          .url()
          .includes(`synthetics/overview_status?query=&tags=${FIRST_TAG}&tags=${SECOND_TAG}`) &&
        request.url().includes('useLogicalAndFor=tags') &&
        request.method() === 'GET'
      ) {
        requestMade = true;
      }
    });

    // Click on the Tags filter button using aria-label
    await page.getByLabel('expands filter group for Tags filter').click();

    // Click on both tags and on the logical AND switch
    await page.getByRole('option', { name: FIRST_TAG }).click();
    await page.getByRole('option', { name: SECOND_TAG }).click();
    await page.getByTestId('tagsLogicalOperatorSwitch').click();
    await page.getByTestId('o11yFieldValueSelectionApplyButton').click();

    await retry.tryForTime(5 * 1000, async () => {
      expect(requestMade).toBe(true);
      // Only one monitor should be shown because we are using logical AND
      await expect(page.getByText('Showing 1 Monitor')).toBeVisible();
    });
  });

  step('Filter monitors by tags: use logical OR', async () => {
    let requestMade = false;
    page.on('request', (request) => {
      if (
        request
          .url()
          .includes(`synthetics/overview_status?query=&tags=${FIRST_TAG}&tags=${SECOND_TAG}`) &&
        request.method() === 'GET'
      ) {
        requestMade = true;
      }
    });

    // Click on the Tags filter button using aria-label
    await page.getByLabel('expands filter group for Tags filter').click();

    // Turn off the logical AND switch
    await page.getByTestId('tagsLogicalOperatorSwitch').click();
    await page.getByTestId('o11yFieldValueSelectionApplyButton').click();

    await retry.tryForTime(5 * 1000, async () => {
      expect(requestMade).toBe(true);
      // Two monitors should be shown because we are using logical OR
      await expect(page.getByText('Showing 2 Monitors')).toBeVisible();
    });
  });
});
