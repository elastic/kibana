/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { TIMEOUTS } from '../../../../constants/timeouts';
import type { RulesManagementLocators } from './rules_management_locators';
import type { TableOperations } from './table_operations';

/**
 * Assertions for the Rules Management Page Object
 *
 * This class contains all expectation/assertion methods for verifying
 * the state and behavior of the Rules Management page.
 */
export class RulesManagementAssertions {
  constructor(
    private readonly locators: RulesManagementLocators,
    private readonly tableOps: TableOperations
  ) {}

  /**
   * Asserts that a specific number of rules are displayed
   * @param expectedCount - The expected number of rules
   */
  async expectRulesCount(expectedCount: number) {
    const rows = this.tableOps.getRulesTableRows();
    await expect(rows).toHaveCount(expectedCount);
  }

  /**
   * Asserts that a rule with the given name is visible
   * @param ruleName - The name of the rule to check
   */
  async expectRuleVisible(ruleName: string) {
    const rule = this.locators.ruleName(ruleName);
    await expect(rule).toBeVisible();
  }

  /**
   * Asserts that a rule with the given name is not visible
   * @param ruleName - The name of the rule to check
   */
  async expectRuleNotVisible(ruleName: string) {
    const rule = this.locators.ruleName(ruleName);
    await expect(rule).toBeHidden();
  }

  /**
   * Asserts that the empty state is visible
   */
  async expectEmptyState() {
    await expect(this.locators.rulesEmptyPrompt).toBeVisible();
  }

  /**
   * Asserts the number of selected rules
   * @param count - Expected count of selected rules
   */
  async expectSelectedRulesCount(count: number) {
    await expect(this.locators.selectedRulesLabel).toContainText(`${count}`);
  }

  /**
   * Asserts that a success toast with the given message is visible
   * @param message - The expected toast message
   */
  async expectSuccessToast(message: string) {
    await expect(this.locators.successToastHeader).toBeVisible({
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await expect(this.locators.toastBody).toContainText(message);
  }
}
