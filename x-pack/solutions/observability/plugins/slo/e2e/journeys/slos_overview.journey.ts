/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, expect } from '@elastic/synthetics';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { SLoDataService } from '../services/slo_data_service';
import { sloAppPageProvider } from '../page_objects/slo_app';

journey(`SLOsOverview`, async ({ page, params }) => {
  const sloApp = sloAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const dataService = new SLoDataService({
    kibanaUrl: params.kibanaUrl,
    elasticsearchUrl: params.elasticsearchUrl,
    getService: params.getService,
  });

  const retry: RetryService = params.getService('retry');

  before(async () => {
    await dataService.generateSloData();
    await dataService.addSLO();
  });

  step('Go to slos overview', async () => {
    await sloApp.navigateToOverview(true);
  });

  step('validate data retention tab', async () => {
    await retry.tryWithRetries(
      'check if slos are displayed',
      async () => {
        await page.waitForSelector('text="Test Stack SLO"');
        const cards = await page.locator('text="Test Stack SLO"').all();
        expect(cards.length > 5).toBeTruthy();
      },
      {
        retryCount: 50,
        retryDelay: 20000,
        timeout: 60 * 20000,
      },
      async () => {
        await page.getByTestId('querySubmitButton').click();
      }
    );
  });
});
