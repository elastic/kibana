/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEOUTS } from '../../../../constants/timeouts';
import type { RulesManagementLocators } from './rules_management_locators';

/**
 * Actions related to rule CRUD operations in Rules Management
 *
 * This class handles enabling/disabling, editing, duplicating, deleting, and running rules.
 */
export class RuleActions {
  constructor(private readonly locators: RulesManagementLocators) {}

  /**
   * Enables or disables a rule by clicking its switch
   * @param index - The index of the rule in the table (0-based)
   */
  async toggleRuleSwitch(index: number = 0) {
    const ruleSwitch = this.locators.ruleSwitch(index);
    await ruleSwitch.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await ruleSwitch.click();

    // Wait for the loader to appear and disappear
    const loader = this.locators.ruleSwitchLoader(index);
    await loader.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD }).catch(() => {
      // Loader might not appear if operation is very fast
    });
    await loader.waitFor({ state: 'hidden', timeout: TIMEOUTS.UI_ELEMENT_STANDARD }).catch(() => {
      // Continue if loader was not visible
    });
  }

  /**
   * Opens the actions menu for the first rule
   */
  async openFirstRuleActionsMenu() {
    // eslint-disable-next-line playwright/no-nth-methods
    const firstButton = this.locators.collapsedActionButton.first();
    await firstButton.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await firstButton.click();
  }

  /**
   * Edits the first rule in the table
   */
  async editFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.locators.editRuleActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.locators.editRuleActionButton.click();
  }

  /**
   * Duplicates the first rule in the table
   */
  async duplicateFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.locators.duplicateRuleActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.locators.duplicateRuleActionButton.click();
    await this.locators.confirmDuplicateRuleButton.click();
  }

  /**
   * Deletes the first rule in the table
   */
  async deleteFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.locators.deleteRuleActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.locators.deleteRuleActionButton.click();
    await this.locators.confirmDeleteRuleButton.click();
  }

  /**
   * Manually runs the first rule in the table
   */
  async manualRunFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.locators.manualRuleRunActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.locators.manualRuleRunActionButton.click();
  }
}
