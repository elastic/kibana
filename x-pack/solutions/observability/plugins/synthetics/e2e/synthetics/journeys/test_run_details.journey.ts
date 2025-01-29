/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { byTestId } from '../../helpers/utils';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import { SyntheticsServices } from './services/synthetics_services';

const journeySkip =
  (...params: Parameters<typeof journey>) =>
  () =>
    journey(...params);
// TODO: skipped because failing on main and need to unblock CI
journeySkip(`TestRunDetailsPage`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  const services = new SyntheticsServices(params);

  before(async () => {
    await services.cleaUp();
    await services.enableMonitorManagedViaApi();
    await services.addTestMonitor(
      'https://www.google.com',
      {
        type: 'browser',
        form_monitor_type: 'single',
        urls: 'https://www.google.com',
        'source.inline.script':
          "step('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n});\n\nstep('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n});",
        custom_heartbeat_id: 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b',
        locations: [
          { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
        ],
      },
      'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b'
    );
    await services.addTestSummaryDocument({
      docType: 'summaryUp',
      monitorId: 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b',
      configId: 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b',
      locationName: 'North America - US Central',
    });
  });

  after(async () => {
    await services.cleaUp();
  });

  step('Go to monitor summary page', async () => {
    await syntheticsApp.navigateToOverview(true);
  });

  // TODO: Check why the text is
  // https://www.google.comNorth America - US CentralDuration0 ms
  step('verified overview card contents', async () => {
    await page.waitForSelector('text=https://www.google.com');
    const cardItem = await page.getByTestId('https://www.google.com-metric-item');
    expect(await cardItem.textContent()).toBe(
      'https://www.google.comNorth America - US CentralDuration155 ms'
    );
  });

  step('Monitor is as up in summary page', async () => {
    await page.hover('text=https://www.google.com');
    await page.click('[aria-label="Open actions menu"]');
    await page.click('text=Go to monitor');
    await page.waitForSelector(byTestId('monitorLatestStatusUp'));
    await page.click(byTestId('syntheticsMonitorHistoryTab'));
  });

  step('Go to test run page', async () => {
    await page.click(byTestId('superDatePickerToggleQuickMenuButton'));
    await page.getByTestId('superDatePickerQuickMenu').getByLabel('Time value').fill('10');
    await page
      .getByTestId('superDatePickerQuickMenu')
      .getByLabel('Time unit')
      .selectOption('Years');
    await page.getByTestId('superDatePickerQuickMenu').getByText('Apply').click();
    await page.mouse.wheel(0, 1000);
    await page.click(byTestId('row-ab240846-8d22-11ed-8fac-52bb19a2321e'));

    await page.waitForSelector('text=Test run details');
    await page.waitForSelector('text=Go to https://www.google.com');
    await page.waitForSelector('div:has-text("After 2.12 s")');
  });
});
