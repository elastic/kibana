/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams } from '../../../../common/rule_api_helpers';
import { getNewRule } from '../../../../common/rule_objects';
import { SECURITY_ARCHIVES } from '../../../../common/es_helpers';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Alert user assignment',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getNewRule({ rule_id: 'new-custom-rule' }));
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    test('alert with no assignees renders empty state', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Verify empty assignees in alerts table', async () => {
        const assigneesColumn = page.testSubj.locator('alertAssignees');
        const emptyAssignee = assigneesColumn.first();
        await expect(emptyAssignee).toBeVisible();
      });

      await test.step('Expand alert and verify empty assignees in flyout', async () => {
        const expandBtn = page.testSubj.locator('expand-event').first();
        await expandBtn.click();

        const flyoutAssignees = page.testSubj.locator('securitySolutionFlyoutHeaderAssignees');
        await expect(flyoutAssignees).toBeVisible();
      });
    });

    test('assign and unassign users to alerts', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Assign user to first alert', async () => {
        const moreActionsBtn = page.testSubj.locator('expand-event').first();
        await moreActionsBtn.click();
        const actionsBtn = page.testSubj.locator('alertActionButton').first();
        await actionsBtn.click();
        const assigneesAction = page.testSubj.locator('update-assignees-menu-item');
        await assigneesAction.click();

        const assigneesPopover = page.testSubj.locator('alert-assignees-selectable');
        await expect(assigneesPopover).toBeVisible();

        const userOption = assigneesPopover.getByRole('option').first();
        await userOption.click();
        await page.keyboard.press('Escape');
      });

      await test.step('Verify assignee appears in table', async () => {
        const assigneesColumn = page.testSubj.locator('alertAssignees');
        await expect(assigneesColumn.first()).toBeVisible();
      });

      await test.step('Remove all assignees', async () => {
        const moreActionsBtn = page.testSubj.locator('expand-event').first();
        await moreActionsBtn.click();
        const actionsBtn = page.testSubj.locator('alertActionButton').first();
        await actionsBtn.click();
        const assigneesAction = page.testSubj.locator('update-assignees-menu-item');
        await assigneesAction.click();

        const assigneesPopover = page.testSubj.locator('alert-assignees-selectable');
        await expect(assigneesPopover).toBeVisible();

        const selectedUser = assigneesPopover.getByRole('option', { selected: true }).first();
        await selectedUser.click();
        await page.keyboard.press('Escape');
      });
    });

    test('bulk assign users to multiple alerts', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Select multiple alerts', async () => {
        await detectionAlerts.selectNumberOfAlerts(3);
      });

      await test.step('Bulk assign via bulk actions', async () => {
        const bulkActionsBtn = page.testSubj.locator('selectedShowBulkActionsButton');
        await bulkActionsBtn.click();

        const assigneesAction = page.testSubj.locator('update-assignees-button');
        await assigneesAction.click();

        const assigneesPopover = page.testSubj.locator('alert-assignees-selectable');
        await expect(assigneesPopover).toBeVisible();

        const userOption = assigneesPopover.getByRole('option').first();
        await userOption.click();
        await page.keyboard.press('Escape');
      });
    });

    test('filter alerts by assignees', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Open assignees filter', async () => {
        const assigneesFilter = page.testSubj
          .locator('filter-group__item')
          .filter({ hasText: 'Assignees' });
        await assigneesFilter.click();
      });

      await test.step('Select "No assignees" filter option', async () => {
        const noAssigneesOption = page.getByRole('option', { name: /no assignees/i });
        await noAssigneesOption.click();
      });

      await test.step('Verify alerts are filtered', async () => {
        await expect(detectionAlerts.alertsCount).toBeVisible();
      });
    });
  }
);
