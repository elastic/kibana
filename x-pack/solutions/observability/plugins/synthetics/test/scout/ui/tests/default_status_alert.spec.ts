/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/255548
test.describe.skip('DefaultStatusAlert', { tag: tags.stateful.classic }, () => {
  let configId: string;
  let locationId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
    await syntheticsServices.deleteCustomRules();
    await syntheticsServices.deleteSettingsAndConnectors();
    const location = await syntheticsServices.getDefaultLocation();
    locationId = location.id;
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
    await syntheticsServices.deleteCustomRules();
    await syntheticsServices.deleteSettingsAndConnectors();
  });

  test('creates default alert, triggers on down status, and recovers', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    test.setTimeout(3 * 60_000);
    const firstCheckTime = new Date(Date.now()).toISOString();

    await test.step('setup: create monitor with connector and summary doc', async () => {
      const connector = await syntheticsServices.setupConnector();
      await syntheticsServices.setupSettings(connector.id);
      configId = await syntheticsServices.addMonitor('Test Monitor', {
        type: 'http',
        urls: 'https://www.google.com',
      });
      await syntheticsServices.addSummaryDocument({
        timestamp: firstCheckTime,
        configId,
      });
    });

    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('edit default status alert rule schedule', async () => {
      await pageObjects.syntheticsApp.openManageStatusRule();
      await pageObjects.syntheticsApp.editStatusRuleSchedule({ value: '20', unit: 'second' });
    });

    await test.step('monitor shows as up', async () => {
      await expect
        .poll(async () => page.testSubj.locator('syntheticsOverviewUp').textContent(), {
          timeout: 30_000,
        })
        .toBe('1Up');
    });

    await test.step('disable and re-enable status alert', async () => {
      await pageObjects.syntheticsApp.openMonitorActionsMenu('Test Monitor');
      await page.click('text=Disable status alert');
      await expect(
        page.getByText('Alerts are now disabled for the monitor "Test Monitor".')
      ).toBeVisible();

      await page.testSubj.locator(`Test Monitor-${locationId}-metric-item`).hover();
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

      await expect(async () => {
        await page.testSubj.click('querySubmitButton');
        await pageObjects.syntheticsApp.waitForLoadingToFinish();
        await expect(page.getByText('1 Alert')).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 60_000 });
    });

    // TODO: The following steps require a better test design.
    // The Observability Alerts page always loads with a "Status: active" filter chip pre-applied
    // (visible in the URL/session state), which filters out "Recovered" alerts. Steps that check
    // for "Recovered" will always see an empty table regardless of the actual alert state.
    // To fix this properly, the page object should navigate to the alerts page with the status
    // filter explicitly cleared (e.g. via URL params) before asserting recovered/active states,
    // or the test should use the Kibana alerts API to verify alert status directly without the UI filter.
    //
    // await test.step('recover alert by setting monitor to up', ...);
    // await test.step('second down generates another alert', ...);
    // await test.step('adding another down monitor creates additional alert', ...);
    // await test.step('deleting monitor recovers the alert', ...);
  });
});
