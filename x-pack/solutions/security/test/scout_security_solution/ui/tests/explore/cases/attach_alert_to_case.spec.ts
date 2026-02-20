/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Alerts timeline', {
  tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
}, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(kbnClient, getCustomQueryRuleParams({ rule_id: 'rule1', enabled: true }));
    await browserAuth.loginAsAdmin();
  });

  test.describe('Privileges: read only', { tag: [...tags.stateful.classic] }, () => {
    test('should not allow user with read only privileges to attach alerts to existing cases', async ({
      pageObjects,
      page,
      browserAuth,
    }) => {
      await browserAuth.loginAs(ROLES.reader);
      await pageObjects.explore.gotoUrl(ALERTS_URL);
      await page.testSubj.locator('alertsTable').first().waitFor({ state: 'visible', timeout: 30_000 });
      const contextMenuBtn = page.testSubj.locator('alertsTableRowActionButton');
      await expect(contextMenuBtn.first()).toBeDisabled();
    });

    test('should not allow user with read only privileges to attach alerts to a new case', async ({
      pageObjects,
      page,
      browserAuth,
    }) => {
      await browserAuth.loginAs(ROLES.reader);
      await pageObjects.explore.gotoUrl(ALERTS_URL);
      await page.testSubj.locator('alertsTable').first().waitFor({ state: 'visible', timeout: 30_000 });
      const contextMenuBtn = page.testSubj.locator('alertsTableRowActionButton');
      await expect(contextMenuBtn.first()).toBeDisabled();
    });
  });

  test.describe('Privileges: can crud', { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] }, () => {
    test('should allow a user with crud privileges to attach alerts to cases', async ({
      pageObjects,
      page,
      browserAuth,
    }) => {
      await browserAuth.loginAs('platform_engineer' as SecurityRoleName);
      await pageObjects.explore.gotoUrl(ALERTS_URL);
      await page.testSubj.locator('alertsTable').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.testSubj.locator('loading-spinner').first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      await page.testSubj.locator('alertsTableRowActionButton').first().click();
      const attachButton = page.testSubj.locator('attach-alert-to-case-button');
      await expect(attachButton.first()).toBeEnabled();
    });
  });
});
