/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { createRule, deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import {
  getCustomQueryRuleParams,
  getExistingRule,
  getNewRule,
  getNewOverrideRule,
  getNewThresholdRule,
} from '../../../common/rule_objects';
import { resetRulesTableState } from '../../../common/rule_api_helpers';

const FIRST_RULE = 0;
const SECOND_RULE = 1;
const FOURTH_RULE = 3;

test.describe(
  'Rules table: sorting',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({
      browserAuth,
      apiServices,
      kbnClient,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getCustomQueryRuleParams({ rule_id: '1', enabled: false }));
      await createRuleFromParams(kbnClient, getExistingRule({ rule_id: '2', enabled: false }));
      await createRuleFromParams(kbnClient, getNewOverrideRule({ rule_id: '3', enabled: false }));
      await createRuleFromParams(kbnClient, getNewThresholdRule({ rule_id: '4', enabled: false }));
    });

    test('Sorts by enabled rules', async ({ pageObjects }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();

      await pageObjects.rulesManagementTable.enableRuleAtPosition(SECOND_RULE);
      await pageObjects.rulesManagementTable.waitForRuleToUpdate();
      await pageObjects.rulesManagementTable.enableRuleAtPosition(FOURTH_RULE);
      await pageObjects.rulesManagementTable.waitForRuleToUpdate();

      const ruleSwitch = pageObjects.rulesManagementTable.ruleSwitch;
      await expect(ruleSwitch.nth(SECOND_RULE)).toHaveAttribute('role', 'switch');
      await expect(ruleSwitch.nth(FOURTH_RULE)).toHaveAttribute('role', 'switch');

      await pageObjects.rulesManagementTable.sortByColumn('Enabled', 'desc');

      await expect(ruleSwitch.nth(FIRST_RULE)).toHaveAttribute('role', 'switch');
      await expect(ruleSwitch.nth(SECOND_RULE)).toHaveAttribute('role', 'switch');
    });

    test('Pagination updates page number and results', async ({
      pageObjects,
      kbnClient,
    }) => {
      await createRuleFromParams(
        kbnClient,
        getNewRule({ name: 'Test a rule', rule_id: '5', enabled: false })
      );
      await createRuleFromParams(
        kbnClient,
        getNewRule({ name: 'Not same as first rule', rule_id: '6', enabled: false })
      );

      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.setRowsPerPage(5);

      const rulesTable = pageObjects.rulesManagementTable.rulesTable;
      const firstPageBtn = pageObjects.rulesManagementTable.page.locator(
        '[data-test-subj="pagination-button-0"]'
      );
      await expect(firstPageBtn).toHaveAttribute('aria-current', 'page');

      const ruleNameFirst = await pageObjects.rulesManagementTable.ruleName.first().textContent();
      await pageObjects.rulesManagementTable.goToPage(2);

      const rows = await pageObjects.rulesManagementTable.getTableRows();
      await expect(rows).toHaveCount(1, { timeout: 5000 });
      await expect(rulesTable).not.toContainText(ruleNameFirst ?? '');

      const secondPageBtn = pageObjects.rulesManagementTable.page.locator(
        '[data-test-subj="pagination-button-1"]'
      );
      await expect(firstPageBtn).not.toHaveAttribute('aria-current', 'page');
      await expect(secondPageBtn).toHaveAttribute('aria-current', 'page');
    });
  }
);
