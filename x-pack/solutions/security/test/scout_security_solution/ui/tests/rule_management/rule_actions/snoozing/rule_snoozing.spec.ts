/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../../common/rule_objects';

const RULE_NAME = 'Rule to snooze';

test.describe(
  'Rule snoozing',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: RULE_NAME, rule_id: 'snooze-test', enabled: false })
      );
    });

    test('can snooze a rule from the rules table', async ({ pageObjects, page }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      const row = pageObjects.rulesManagementTable.rulesTable
        .locator('.euiTableRow')
        .filter({ hasText: RULE_NAME });
      const snoozeBtn = row.locator('[data-test-subj="ruleSnoozeBadge"]');
      await snoozeBtn.click();

      const snoozeOption = page.getByRole('button', { name: /1 hour/i });
      await snoozeOption.click();

      await expect(row.locator('[data-test-subj="ruleSnoozeBadge"]')).toContainText(/snoozed/i);
    });

    test('can unsnooze a snoozed rule', async ({ pageObjects, page, kbnClient }) => {
      const ruleResp = await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: 'Snoozed rule', rule_id: 'unsnooze-test', enabled: false })
      );

      await kbnClient.request({
        method: 'POST',
        path: `/internal/alerting/rule/${ruleResp.id}/_snooze`,
        body: {
          snooze_schedule: {
            duration: 3600000,
            rRule: {
              dtstart: new Date().toISOString(),
              count: 1,
              tzid: 'UTC',
            },
          },
        },
        headers: { 'x-elastic-internal-origin': 'security-solution' },
      });

      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      const row = pageObjects.rulesManagementTable.rulesTable
        .locator('.euiTableRow')
        .filter({ hasText: 'Snoozed rule' });
      const snoozeBtn = row.locator('[data-test-subj="ruleSnoozeBadge"]');
      await snoozeBtn.click();

      const unsnoozeBtn = page.getByRole('button', { name: /unsnooze/i });
      await unsnoozeBtn.click();

      await expect(row.locator('[data-test-subj="ruleSnoozeBadge"]')).not.toContainText(/snoozed/i);
    });
  }
);
