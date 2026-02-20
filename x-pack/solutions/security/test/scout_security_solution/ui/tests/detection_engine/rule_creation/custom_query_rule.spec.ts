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
import { resetRulesTableState } from '../../../common/rule_api_helpers';

test.describe(
  'Custom query rule - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const rule = getCustomQueryRuleParams();

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await resetRulesTableState(page);
    });

    test('Creates and enables a rule', async ({ pageObjects, kbnClient }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...rule,
        rule_id: `rule-${Date.now()}`,
      });
      await pageObjects.ruleEdit.gotoRuleDetails(created.id);
      await expect(pageObjects.ruleEdit.ruleNameHeader.first()).toContainText(rule.name);
    });

    test.skip('Adds filter on define step', async () => {
      // FLAKEY - Cypress skipInServerless. Needs: openAddFilterPopover, fillAddFilterForm, GLOBAL_SEARCH_BAR_FILTER_ITEM
    });
  }
);
