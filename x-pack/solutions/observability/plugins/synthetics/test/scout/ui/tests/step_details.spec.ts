/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('StepDetailsPage', { tag: tags.stateful.classic }, () => {
  const configId = 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b';
  const checkGroup = 'ab240846-8d22-11ed-8fac-52bb19a2321e';
  let locationId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
    await syntheticsServices.enable();
    const location = await syntheticsServices.getDefaultLocation();
    locationId = location.id;
    await syntheticsServices.addMonitor(
      'https://www.google.com',
      {
        type: 'browser',
        custom_heartbeat_id: configId,
        'source.inline.script':
          "step('step1', async ({ page }) => { await page.goto('https://www.google.com'); });",
      },
      configId
    );
    await syntheticsServices.addSummaryDocument({
      docType: 'journeyStart',
      configId,
      testRunId: checkGroup,
      monitorId: configId,
      name: 'https://www.google.com',
    });
    await syntheticsServices.addSummaryDocument({
      docType: 'stepEnd',
      stepIndex: 1,
      configId,
      testRunId: checkGroup,
      monitorId: configId,
      name: 'https://www.google.com',
    });
    await syntheticsServices.addSummaryDocument({
      docType: 'journeyEnd',
      configId,
      testRunId: checkGroup,
      monitorId: configId,
      name: 'https://www.google.com',
    });
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('displays step detail metrics', async ({ pageObjects, page, browserAuth }) => {
    await test.step('login and navigate to step details', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToStepDetails({
        stepIndex: 1,
        checkGroup,
        configId,
        locationId,
      });
    });

    await test.step('verify metrics are displayed', async () => {
      await expect(page.getByText('558 KB')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('402 ms')).toBeVisible();
      await expect(page.getByText('521 ms')).toBeVisible();
    });
  });
});
