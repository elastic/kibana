/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { TIMEOUTS } from '../../../../constants/timeouts';
import type { RulesManagementLocators } from './rules_management_locators';
import type { TableOperations } from './table_operations';

/**
 * Actions related to searching and filtering rules
 *
 * This class handles search, filter by type, filter by state, and filter by tags.
 */
export class SearchFilterActions {
  constructor(
    private readonly page: ScoutPage,
    private readonly locators: RulesManagementLocators,
    private readonly tableOps: TableOperations
  ) {}

  /**
   * Searches for rules by name or description
   * @param searchTerm - The text to search for
   */
  async searchRules(searchTerm: string) {
    await this.locators.ruleSearchField.clear();
    await this.locators.ruleSearchField.fill(searchTerm);
    // Wait for table to update
    await this.tableOps.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only Elastic rules
   */
  async filterByElasticRules() {
    await this.locators.elasticRulesFilterButton.click();
    await this.tableOps.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only custom rules
   */
  async filterByCustomRules() {
    await this.locators.customRulesFilterButton.click();
    await this.tableOps.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only enabled rules
   */
  async filterByEnabledRules() {
    await this.locators.enabledRulesFilterButton.click();
    await this.tableOps.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only disabled rules
   */
  async filterByDisabledRules() {
    await this.locators.disabledRulesFilterButton.click();
    await this.tableOps.waitForRulesTableToLoad();
  }

  /**
   * Opens the tags filter popover
   */
  async openTagsFilter() {
    await this.locators.tagsFilterButton.click();
    await this.locators.tagsFilterPopover.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Filters rules by a specific tag
   * @param tagName - The tag to filter by
   */
  async filterByTag(tagName: string) {
    await this.openTagsFilter();
    const tagOption = this.page.locator('.euiSelectableListItem').filter({ hasText: tagName });
    await tagOption.click();
    await this.tableOps.waitForRulesTableToLoad();
  }
}
