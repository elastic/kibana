/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('Creates a custom TLS alert rule', { tag: tags.stateful.classic }, () => {
  const tlsRuleName = 'synthetics-e2e-monitor-tls-rule';
  let configId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
    await syntheticsServices.deleteCustomRules();
    configId = await syntheticsServices.addMonitor(
      'Test Monitor',
      {
        type: 'http',
        urls: 'https://www.google.com',
      },
      configId,
      { tls: { enabled: true } }
    );
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    await syntheticsServices.addSummaryDocument({
      configId,
      tlsNotAfter: tomorrowDate.toISOString(),
      tlsNotBefore: new Date().toISOString(),
    });
  });

  test.beforeEach(async ({ pageObjects, browserAuth, page }) => {
    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('open create TLS rule flyout', async () => {
      await pageObjects.syntheticsApp.refreshOverview();
      await pageObjects.syntheticsApp.openManageTlsRule();
      await page.testSubj.click('createNewTLSRule');
      await expect(page.testSubj.locator('ruleDefinition')).toBeVisible();
    });
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
    await syntheticsServices.deleteCustomRules();
  });

  test('can filter monitors by KQL', async ({ pageObjects, page }) => {
    await expect(pageObjects.syntheticsApp.ruleMonitorCountButton).toBeVisible({});
    await page.testSubj.typeWithDelay('queryInput', 'monitor.type: "tcp"', { delay: 100 });
    await page.testSubj.locator('queryInput').press('Enter');
    await expect(pageObjects.syntheticsApp.ruleMonitorCountButton).toHaveText(
      '0 existing monitors'
    );
  });

  test('can filter monitors by type', async ({ pageObjects, page }) => {
    await expect(pageObjects.syntheticsApp.ruleMonitorCountButton).toBeVisible({});
    await page.getByRole('button', { name: 'Type All' }).click();
    await page.testSubj.click('monitorTypeField');
    await page.getByRole('option', { name: 'http' }).click();
    await page.testSubj
      .locator('ruleDefinition')
      .getByRole('button', { name: 'Type http' })
      .click();
    await expect(pageObjects.syntheticsApp.ruleMonitorCountButton).toHaveText('1 existing monitor');
  });

  test('can create rule and fire alert', async ({ pageObjects, page }) => {
    await test.step('create TLS rule', async () => {
      await expect(pageObjects.syntheticsApp.ruleMonitorCountButton).toBeVisible({});
      let requestMade = false;
      page.on('request', (request) => {
        if (request.url().includes('api/alerting/rule') && request.method() === 'POST') {
          requestMade = true;
        }
      });

      await page.testSubj.locator('ruleScheduleNumberInput').fill('5');
      await page.testSubj.locator('ruleScheduleUnitInput').selectOption('seconds');
      await page.testSubj.click('ruleFormStep-details');
      await page.testSubj.locator('ruleDetailsNameInput').fill(tlsRuleName);
      await page.testSubj.click('ruleFlyoutFooterSaveButton');
      await page.testSubj.click('confirmModalConfirmButton');
      expect(requestMade).toBe(true);
    });

    await test.step('verify rule creation', async () => {
      await pageObjects.syntheticsApp.goToRulesPage();
      // eslint-disable-next-line playwright/no-nth-methods
      await expect(page.getByText(tlsRuleName).first()).toBeVisible();
    });

    await test.step('verify alert fires', async () => {
      await pageObjects.syntheticsApp.navigateToAlertsPage();

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        // eslint-disable-next-line playwright/no-nth-methods
        await expect(page.getByText(tlsRuleName).first()).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 30_000 });
    });
  });
});
