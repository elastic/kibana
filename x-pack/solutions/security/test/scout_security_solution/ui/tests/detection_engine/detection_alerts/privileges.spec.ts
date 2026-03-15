/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe(
  'Alerts page - privileges',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getCustomQueryRuleParams());
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    test('admin user can close alerts', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Select alerts and close them', async () => {
        await detectionAlerts.selectNumberOfAlerts(3);
        const closeAlertsBtn = page.testSubj.locator('alert-close-context-menu-item');
        await closeAlertsBtn.click();
      });

      await test.step('Verify success toast', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText('Successfully closed');
      });
    });

    test('admin user can add an exception from alert actions', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Expand first alert actions and click add exception', async () => {
        const moreActionsBtn = page.testSubj.locator('expand-event').first();
        await moreActionsBtn.click();
        const actionsBtn = page.testSubj.locator('alertActionButton').first();
        await actionsBtn.click();
        const addExceptionBtn = page.testSubj.locator('add-exception-menu-item');
        await addExceptionBtn.click();
      });

      await test.step('Verify exception flyout is visible', async () => {
        const exceptionFlyout = page.testSubj.locator('exceptionFlyoutTitle');
        await expect(exceptionFlyout).toBeVisible();
      });
    });

    test('viewer user cannot see alerts page without privileges', async ({ page, browserAuth }) => {
      await browserAuth.loginAsViewer();
      await page.goto(ALERTS_URL);

      const noPrivilegesBox = page.testSubj.locator('noPrivilegesPage');
      await expect(noPrivilegesBox).toBeVisible();
    });
  }
);
