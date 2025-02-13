/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after } from '@elastic/synthetics';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import { SyntheticsServices } from './services/synthetics_services';

journey(`StepDetailsPage`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  const services = new SyntheticsServices(params);

  before(async () => {
    await services.cleaUp();
    await services.enableMonitorManagedViaApi();
    await services.addTestMonitor(
      'https://www.google.com',
      {
        type: 'browser',
        custom_heartbeat_id: 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b',
        locations: [
          { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
        ],
        'source.inline.script':
          "step('step1', async ({ page }) => { await page.goto('https://www.google.com'); });",
      },
      'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b'
    );
  });

  after(async () => {
    await services.cleaUp();
  });

  step('Go to step details page', async () => {
    await syntheticsApp.navigateToStepDetails({
      stepIndex: 1,
      checkGroup: 'ab240846-8d22-11ed-8fac-52bb19a2321e',
      configId: 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b',
    });
  });

  step('it shows metrics', async () => {
    await page.waitForSelector('text=558 KB');
    await page.waitForSelector('text=402 ms');
    await page.waitForSelector('text=521 ms');
  });
});
