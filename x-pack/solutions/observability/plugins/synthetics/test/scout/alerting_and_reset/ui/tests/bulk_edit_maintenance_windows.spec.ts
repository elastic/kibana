/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KbnClient } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../common/ui/fixtures';

const MW_API = '/internal/alerting/rules/maintenance_window';
const MW_HEADERS = { 'elastic-api-version': '2023-10-31', 'x-elastic-internal-origin': 'kibana' };
const MW_TITLE = 'scout-bulk-mw';

interface MaintenanceWindow {
  id: string;
  title: string;
}

const createMaintenanceWindow = async (
  kbnClient: KbnClient,
  title: string
): Promise<MaintenanceWindow> => {
  const { data } = await kbnClient.request<MaintenanceWindow>({
    method: 'POST',
    path: MW_API,
    headers: MW_HEADERS,
    body: {
      title,
      duration: 60 * 60 * 1000,
      r_rule: { dtstart: new Date().toISOString(), tzid: 'UTC', freq: 0, count: 1 },
      category_ids: ['observability'],
    },
  });
  return data;
};

const deleteMaintenanceWindow = async (kbnClient: KbnClient, id: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${MW_API}/${id}`,
    headers: MW_HEADERS,
    ignoreErrors: [404],
  });
};

// Screenshot with dynamic content masked, saved to the Scout output dir and
// attached to the HTML report so the states are reviewable per run.
interface CaptureTestInfo {
  outputPath: (name: string) => string;
  attach: (name: string, options: { path: string; contentType: string }) => Promise<void>;
}

const capture = async (page: ScoutPage, testInfo: CaptureTestInfo, name: string) => {
  const masks = [
    page.locator('.echChart'),
    page.testSubj.locator('last-run-time'),
    page.testSubj.locator('monitorLastRunTime'),
  ];
  const filePath = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: filePath, mask: masks, animations: 'disabled', caret: 'hide' });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
};

test.describe('Bulk edit — maintenance windows', { tag: tags.stateful.classic }, () => {
  let maintenanceWindow: MaintenanceWindow;

  test.beforeAll(async ({ syntheticsServices, kbnClient }) => {
    await syntheticsServices.enable();
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.ensurePrivateLocationExists();
    await syntheticsServices.addMonitor('mw bulk monitor 1', {
      type: 'http',
      urls: 'https://elastic.co',
    });
    await syntheticsServices.addMonitor('mw bulk monitor 2', {
      type: 'http',
      urls: 'https://example.com',
    });
    maintenanceWindow = await createMaintenanceWindow(kbnClient, MW_TITLE);
  });

  test.afterAll(async ({ syntheticsServices, kbnClient }) => {
    await syntheticsServices.deleteMonitors();
    if (maintenanceWindow?.id) {
      await deleteMaintenanceWindow(kbnClient, maintenanceWindow.id);
    }
  });

  test('applies a maintenance window to selected monitors in bulk', async ({
    page,
    pageObjects,
    browserAuth,
  }, testInfo) => {
    const app = pageObjects.syntheticsApp;

    await test.step('setup: login and open monitor management', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await app.navigateToMonitorManagement();
    });

    await test.step('select monitors and capture', async () => {
      await app.selectAllMonitors();
      await expect(page.testSubj.locator('syntheticsBulkActionsButton')).toBeVisible();
      await capture(page, testInfo, '01-monitors-selected');
    });

    await test.step('open bulk actions menu and capture', async () => {
      await app.openBulkActionsMenu();
      await expect(page.testSubj.locator('syntheticsBulkMaintenanceWindowsItem')).toBeVisible();
      await capture(page, testInfo, '02-bulk-menu-open');
    });

    await test.step('open the maintenance windows flyout and capture', async () => {
      await page.testSubj.click('syntheticsBulkMaintenanceWindowsItem');
      await expect(page.testSubj.locator('syntheticsBulkMaintenanceWindowsFlyout')).toBeVisible();
      await capture(page, testInfo, '03-flyout-empty');
    });

    await test.step('select a maintenance window and capture', async () => {
      await app.selectMaintenanceWindowInFlyout(MW_TITLE);
      await expect(page.testSubj.locator('syntheticsBulkMaintenanceWindowsSave')).toBeEnabled();
      await capture(page, testInfo, '04-flyout-filled');
    });

    await test.step('save and confirm success', async () => {
      await app.saveBulkMaintenanceWindows();
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(/applied/i, {
        timeout: 15_000,
      });
      await capture(page, testInfo, '05-success-toast');
      await app.waitForMonitorManagementLoadingToFinish();
      await capture(page, testInfo, '06-result-table');
    });
  });
});
