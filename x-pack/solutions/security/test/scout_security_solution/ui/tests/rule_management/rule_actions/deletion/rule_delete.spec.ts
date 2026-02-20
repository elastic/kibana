/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from "../../../../fixtures";
import { deleteAlertsAndRules } from "../../../../common/api_helpers";
import { createRuleFromParams, findAllRules } from "../../../../common/rule_api_helpers";
import { getCustomQueryRuleParams } from "../../../../common/rule_objects";
import { resetRulesTableState } from "../../../../common/rule_api_helpers";

const testRules = [
  getCustomQueryRuleParams({ rule_id: "rule1", name: "Rule 1", enabled: false }),
  getCustomQueryRuleParams({ rule_id: "rule2", name: "Rule 2", enabled: false }),
  getCustomQueryRuleParams({ rule_id: "rule3", name: "Rule 3", enabled: false }),
];

test.describe("Rule deletion", { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
    await browserAuth.loginAsAdmin();
    await resetRulesTableState(page);
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(kbnClient, testRules[0]);
    await createRuleFromParams(kbnClient, testRules[1]);
    await createRuleFromParams(kbnClient, testRules[2]);
  });

  test("User can delete an individual rule", async ({ pageObjects, kbnClient }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.disableAutoRefresh();

    const initialCount = await pageObjects.rulesManagementTable.getRulesManagementTableRowCount();
    const res = await findAllRules(kbnClient);
    expect(res.data.length).toBe(initialCount);

    await pageObjects.rulesManagementTable.deleteFirstRule();

    const afterCount = await pageObjects.rulesManagementTable.getRulesManagementTableRowCount();
    expect(afterCount).toBe(initialCount - 1);

    const resAfter = await findAllRules(kbnClient);
    expect(resAfter.data.length).toBe(afterCount);
  });

  test("User can delete multiple selected rules via a bulk action", async ({ pageObjects, kbnClient }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.disableAutoRefresh();

    const initialCount = await pageObjects.rulesManagementTable.getRulesManagementTableRowCount();
    await pageObjects.rulesManagementTable.selectRulesByName(["Rule 1", "Rule 2"]);
    await pageObjects.rulesManagementTable.deleteSelectedRules();

    const afterCount = await pageObjects.rulesManagementTable.getRulesManagementTableRowCount();
    expect(afterCount).toBe(initialCount - 2);

    const resAfter = await findAllRules(kbnClient);
    expect(resAfter.data.length).toBe(afterCount);
  });
});
