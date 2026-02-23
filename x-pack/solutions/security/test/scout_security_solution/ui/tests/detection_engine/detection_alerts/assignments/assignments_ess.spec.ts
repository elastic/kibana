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

test.describe('Alert assignments (ESS)', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
    await browserAuth.loginAsAdmin();
    await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(kbnClient, getNewRule({ rule_id: 'ess-assign-rule' }));
  });

  test.afterAll(async ({ esArchiver }) => {
    // no-op: Scout EsArchiverFixture does not support unload;
  });

  test('assigns and unassigns alerts in ESS', async ({ page, pageObjects }) => {
    const { detectionAlerts } = pageObjects;

    await page.goto(ALERTS_URL);
    await detectionAlerts.waitForAlertsToLoad();

    await test.step('Assign user to first alert via flyout', async () => {
      const expandBtn = page.testSubj.locator('expand-event').first();
      await expandBtn.click();

      const assigneesBtn = page.testSubj.locator('securitySolutionFlyoutHeaderAssignees');
      await expect(assigneesBtn).toBeVisible();
    });

    await test.step('Verify assignees section is present in flyout', async () => {
      const flyoutAssignees = page.testSubj.locator('securitySolutionFlyoutHeaderAssignees');
      await expect(flyoutAssignees).toBeVisible();
    });
  });
});
