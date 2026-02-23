/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { getReasonMessage } from '../../../../server/alert_rules/status_rule/message_utils';
import { test } from '../fixtures';

test.describe('DefaultStatusAlert', { tag: tags.stateful.classic }, () => {
  let configId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('creates default alert, triggers on down status, and recovers', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    const firstCheckTime = new Date(Date.now()).toISOString();

    await test.step('setup: create monitor with connector and summary doc', async () => {
      const connector = await syntheticsServices.setupConnector();
      await syntheticsServices.setupSettings(connector.id);
      configId = await syntheticsServices.addMonitor('Test Monitor', {
        type: 'http',
        urls: 'https://www.google.com',
        locations: [
          { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
        ],
      });
      await syntheticsServices.addSummaryDocument({
        timestamp: firstCheckTime,
        configId,
      });
    });

    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('edit default status alert rule schedule', async () => {
      await pageObjects.syntheticsApp.openManageStatusRule();

      await expect(page.testSubj.locator('editDefaultStatusRule')).toBeVisible({ timeout: 30_000 });
      await page.testSubj.click('editDefaultStatusRule');

      await expect(page.getByText('Monitor status rule')).toBeVisible();
      await page.testSubj.locator('ruleScheduleUnitInput').selectOption('second');
      await page.testSubj.locator('ruleScheduleNumberInput').fill('20');
      await page.testSubj.click('ruleFlyoutFooterSaveButton');
      await expect(page.getByText('Updated "Synthetics status internal rule"')).toBeVisible();
    });

    await test.step('monitor shows as up', async () => {
      await expect
        .poll(async () => page.testSubj.locator('syntheticsOverviewUp').textContent(), {
          timeout: 90_000,
        })
        .toBe('1Up');
    });

    await test.step('disable and re-enable status alert', async () => {
      await page.hover('text=Test Monitor');
      await page.click('[aria-label="Open actions menu"]');
      await page.click('text=Disable status alert');
      await expect(
        page.getByText('Alerts are now disabled for the monitor "Test Monitor".')
      ).toBeVisible();

      await page.testSubj.locator('Test Monitor-us_central-metric-item').hover();
      await page.click('[aria-label="Open actions menu"]');
      await page.click('text=Enable status alert');
    });

    await test.step('set monitor status to down', async () => {
      await syntheticsServices.addSummaryDocument({
        docType: 'summaryDown',
        configId,
      });

      await page.testSubj.click('syntheticsMonitorManagementTab');
      await page.testSubj.click('syntheticsMonitorOverviewTab');

      await expect
        .poll(async () => page.testSubj.locator('syntheticsOverviewDown').textContent(), {
          timeout: 30_000,
        })
        .toBe('1Down');
    });

    await test.step('verify alert is generated', async () => {
      await pageObjects.syntheticsApp.navigateToAlertsPage();

      const reasonMessage = getReasonMessage({
        name: 'Test Monitor',
        location: 'North America - US Central',
        reason: 'down',
        checks: { downWithinXChecks: 1, down: 1 },
      });

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        await expect(page.getByText('1 Alert')).toBeVisible({ timeout: 5_000 });
        const text = page.testSubj.locator('o11yGetRenderCellValueLink');
        await expect(text).toHaveText(reasonMessage);
      }).toPass({ timeout: 180_000 });
    });

    await test.step('recover alert by setting monitor to up', async () => {
      await syntheticsServices.addSummaryDocument({ configId });

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        await expect(page.getByText('Recovered')).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 180_000 });
    });

    await test.step('second down generates another alert', async () => {
      await syntheticsServices.addSummaryDocument({ docType: 'summaryDown', configId });

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        await expect(page.getByText('Active')).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 180_000 });
    });

    await test.step('adding another down monitor creates additional alert', async () => {
      const monitorId = uuidv4();
      const name = 'Test Monitor 2';
      const configId2 = await syntheticsServices.addMonitor(name, {
        type: 'http',
        urls: 'https://www.google.com',
        custom_heartbeat_id: monitorId,
        locations: [
          { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
        ],
      });
      await syntheticsServices.addSummaryDocument({
        monitorId,
        docType: 'summaryDown',
        name,
        configId: configId2,
      });

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        await expect(page.getByText('2 Alerts')).toBeVisible({ timeout: 10_000 });
      }).toPass({ timeout: 180_000 });
    });

    await test.step('deleting monitor recovers the alert', async () => {
      await syntheticsServices.deleteMonitorByQuery('"Test Monitor 2"');

      await page.testSubj.locator('queryInput').fill('kibana.alert.status : "recovered" ');
      await page.testSubj.click('querySubmitButton');

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        await expect(page.getByText('1 Alert')).toBeVisible({ timeout: 10_000 });
      }).toPass({ timeout: 180_000 });
    });
  });
});
