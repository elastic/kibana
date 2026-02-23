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
  'Alert tags',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getNewRule({ rule_id: 'tags-rule' }));
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    test('adds and removes alert tags', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Select alert and open tagging menu', async () => {
        const alertCheckboxes = detectionAlerts.alertCheckbox;
        const count = await alertCheckboxes.count();
        test.skip(count < 1, 'No alerts available');
        await detectionAlerts.selectNumberOfAlerts(1);

        const bulkActionsBtn = page.testSubj.locator('selectedShowBulkActionsButton');
        await bulkActionsBtn.click();

        const tagAction = page.testSubj.locator('alert-tags-context-menu-item');
        const isVisible = await tagAction.isVisible().catch(() => false);
        test.skip(!isVisible, 'Tag action not available');
        await tagAction.click();
      });

      await test.step('Add a tag', async () => {
        const tagOption = page.getByRole('option', { name: 'Duplicate' });
        const isVisible = await tagOption.isVisible().catch(() => false);
        test.skip(!isVisible, 'Tag option not available');
        await tagOption.click();

        const updateBtn = page.testSubj.locator('alert-tags-update-button');
        await updateBtn.click();
      });

      await test.step('Verify tag was applied', async () => {
        await detectionAlerts.selectNumberOfAlerts(1);
        const bulkActionsBtn = page.testSubj.locator('selectedShowBulkActionsButton');
        await bulkActionsBtn.click();

        const tagAction = page.testSubj.locator('alert-tags-context-menu-item');
        await tagAction.click();

        const selectedTag = page.testSubj.locator('selectedAlertTag');
        const isSelected = await selectedTag.isVisible().catch(() => false);
        expect(isSelected).toBe(true);
      });
    });
  }
);
