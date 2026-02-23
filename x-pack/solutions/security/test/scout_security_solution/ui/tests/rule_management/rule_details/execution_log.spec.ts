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

test.describe(
  'Rule details - execution log',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('displays execution log tab with execution entries', async ({
      pageObjects,
      page,
      kbnClient,
    }) => {
      const ruleResp = await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          name: 'Execution log rule',
          rule_id: 'exec-log-1',
          enabled: true,
        })
      );

      await pageObjects.ruleDetails.goto(ruleResp.id, 'execution_results');
      await pageObjects.ruleDetails.waitForPageToLoad('Execution log rule');

      const executionLogTable = page.testSubj.locator('executionLogTable');
      await expect(executionLogTable).toBeVisible({ timeout: 60_000 });
    });
  }
);
