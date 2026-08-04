/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/268088
test.describe.skip('CustomStatusAlert', { tag: tags.stateful.classic }, () => {
  let configId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('creates a custom status alert rule', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    const firstCheckTime = new Date(Date.now()).toISOString();

    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('create monitor and summary doc', async () => {
      configId = await syntheticsServices.addMonitor(
        'Test Monitor',
        {
          type: 'http',
          urls: 'https://www.google.com',
        },
        configId
      );
      await syntheticsServices.addSummaryDocument({
        timestamp: firstCheckTime,
        configId,
      });
    });

    await test.step('create custom status rule', async () => {
      await pageObjects.syntheticsApp.refreshOverview();
      await pageObjects.syntheticsApp.openManageStatusRule();
      await page.testSubj.click('createNewStatusRule');

      let requestMade = false;
      page.on('request', (request) => {
        if (request.url().includes('api/alerting/rule') && request.method() === 'POST') {
          requestMade = true;
        }
      });

      await page.testSubj.click('ruleFormStep-details');
      await expect(page.getByText('Related dashboards')).toBeVisible();
      await page.testSubj.click('ruleFlyoutFooterSaveButton');
      await page.testSubj.click('confirmModalConfirmButton');
      expect(requestMade).toBe(true);
    });

    await test.step('verify rule creation', async () => {
      await pageObjects.syntheticsApp.goToRulesPage();
      await expect(page.getByText('Synthetics monitor status rule')).toBeVisible();
    });
  });

  test('flags an impossible down threshold vs number of checks', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('open the create status rule form', async () => {
      await pageObjects.syntheticsApp.openManageStatusRule();
      await page.testSubj.click('createNewStatusRule');
      await expect(page.testSubj.locator('valueExpression')).toBeVisible();
    });

    await test.step('set a down threshold greater than the number of checks', async () => {
      // Default condition uses 5 checks, so 10 down checks can never happen.
      await page.testSubj.click('valueExpression');
      await page.testSubj.fill('valueFieldNumber', '10');

      await expect(
        page.getByText('The number of down checks (10) cannot be greater than the number of checks')
      ).toBeVisible();
    });
  });
});
