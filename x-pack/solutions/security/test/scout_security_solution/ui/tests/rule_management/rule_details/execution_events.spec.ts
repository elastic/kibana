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
  'Rule details - execution events',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('displays execution events tab', async ({ pageObjects, page, kbnClient }) => {
      const ruleResp = await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          name: 'Execution events rule',
          rule_id: 'exec-events-1',
          enabled: true,
        })
      );

      await pageObjects.ruleDetails.goto(ruleResp.id, 'execution_events');
      await pageObjects.ruleDetails.waitForPageToLoad('Execution events rule');

      const eventsTab = page.testSubj.locator('navigation-execution_events');
      await expect(eventsTab).toBeVisible();
    });
  }
);
