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

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
    await syntheticsServices.enable();
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
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('displays step detail metrics', async ({ pageObjects, page, browserAuth }) => {
    await test.step('login and navigate to step details', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToStepDetails({
        stepIndex: 1,
        checkGroup,
        configId,
      });
    });

    await test.step('verify metrics are displayed', async () => {
      await expect(page.testSubj.locator('synth-step-metric-transfer-size')).toContainText(
        '558 KB'
      );
      await expect(page.testSubj.locator('synth-step-metric-fcp')).toContainText('402 ms');
      await expect(page.testSubj.locator('synth-step-metric-lcp')).toContainText('521 ms');
    });
  });
});
