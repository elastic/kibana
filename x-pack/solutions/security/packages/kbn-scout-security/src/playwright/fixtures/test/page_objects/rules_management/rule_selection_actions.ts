/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEOUTS } from '../../../../constants/timeouts';
import type { RulesManagementLocators } from './rules_management_locators';

/**
 * Actions related to rule selection in Rules Management
 *
 * This class handles selecting rules by checkbox, name, or bulk selection.
 */
export class RuleSelectionActions {
  constructor(private readonly locators: RulesManagementLocators) {}

  /**
   * Selects a rule by its ID using the checkbox
   * @param ruleId - The rule ID returned from API
   */
  async selectRuleByCheckbox(ruleId: string) {
    const checkbox = this.locators.ruleCheckbox(ruleId);
    await checkbox.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await checkbox.click();
  }

  /**
   * Selects a rule by its name
   * @param ruleName - The display name of the rule
   */
  async selectRuleByName(ruleName: string) {
    const rule = this.locators.ruleName(ruleName);
    await rule.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await rule.click();
  }

  /**
   * Selects all rules on the current page
   */
  async selectAllRulesOnPage() {
    await this.locators.selectAllRulesOnPageCheckbox.click();
  }

  /**
   * Selects all rules across all pages
   */
  async selectAllRules() {
    await this.locators.selectAllRulesButton.click();
  }
}
