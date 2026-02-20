/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';

test.describe(
  'Manual rule run',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('schedule from rule details page', async ({ pageObjects, page, kbnClient }) => {
      const rule = getNewRule({
        rule_id: 'new-custom-rule',
        interval: '5m',
        from: 'now-6m',
      });
      const created = await createRuleFromParams(kbnClient, rule);
      await pageObjects.ruleEdit.gotoRuleDetails(created.id);
      await page.testSubj.locator('rules-details-manual-rule-run').first().click();
      await expect(page.getByText('Successfully scheduled manual run').first()).toBeVisible({
        timeout: 30_000,
      });
    });

    test.skip('schedule from rules management table', async () => {
      // Needs: disableAutoRefresh, manuallyRunFirstRule, TOASTER assertion
    });
  }
);
