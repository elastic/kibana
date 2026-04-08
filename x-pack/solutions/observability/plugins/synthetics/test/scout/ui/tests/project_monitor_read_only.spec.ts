/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('ProjectMonitorReadOnly', { tag: tags.stateful.classic }, () => {
  const monitorName = 'test-project-monitor';

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.enable();
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.ensurePrivateLocationExists();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
  });

  test('project monitor is read-only and can be re-pushed', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    let monitorId: string;
    let originalConfig: Record<string, unknown>;

    await test.step('setup: create project monitor via API', async () => {
      await syntheticsServices.addMonitorProject(monitorName);
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToMonitorManagement();
    });

    await test.step('verify monitor appears', async () => {
      await expect(page.getByText(monitorName)).toBeVisible({ timeout: 30_000 });
    });

    await test.step('verify read-only state', async () => {
      await pageObjects.syntheticsApp.navigateToEditMonitor(monitorName);
      await expect(page.getByText('read-only')).toBeVisible();
      monitorId = new URL(page.url()).pathname.split('/').at(-1) || '';
      originalConfig = (await syntheticsServices.getMonitor(monitorId)) as Record<string, unknown>;
      expect(originalConfig).not.toBeNull();
    });

    await test.step('save without changes preserves config', async () => {
      await pageObjects.syntheticsApp.confirmAndSave(true);
      const newConfig = (await syntheticsServices.getMonitor(monitorId)) as Record<string, unknown>;
      expect(omit(newConfig, ['updated_at', 'created_at'])).toStrictEqual(
        omit({ ...originalConfig, hash: '', revision: 2 }, ['updated_at', 'created_at'])
      );
    });

    await test.step('toggle enable/disable', async () => {
      await pageObjects.syntheticsApp.navigateToEditMonitor(monitorName);
      await page.testSubj.click('syntheticsEnableSwitch');
      await page.testSubj.click('syntheticsAlertStatusSwitch');
      await pageObjects.syntheticsApp.confirmAndSave(true);
    });

    await test.step('re-push overwrites changes', async () => {
      await syntheticsServices.addMonitorProject(monitorName);
      const repushedConfig = (await syntheticsServices.getMonitor(monitorId)) as Record<
        string,
        unknown
      >;
      expect(omit(repushedConfig, ['updated_at', 'created_at'])).toStrictEqual(
        omit({ ...originalConfig, revision: 4 }, ['updated_at', 'created_at'])
      );
    });

    await test.step('delete monitor', async () => {
      await pageObjects.syntheticsApp.navigateToEditMonitor(monitorName);
      await pageObjects.syntheticsApp.deleteMonitorFromEditPage();
      await expect(page.getByText(`Deleted "${monitorName}" monitor successfully.`)).toBeVisible();
    });
  });
});
