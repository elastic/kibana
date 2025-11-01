/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '@kbn/scout';
import { TIMEOUTS } from '../../../constants/timeouts';

/**
 * Page Object for the Rules Management page in Kibana Security Solution
 *
 * This page allows users to manage detection rules, including creating, editing,
 * enabling/disabling, and organizing rules.
 */
export class RulesManagementPage {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Locators - Main Elements
  // ========================================

  public get rulesManagementTable() {
    return this.page.testSubj.locator('rules-management-table');
  }

  public get rulesMonitoringTable() {
    return this.page.testSubj.locator('rules-monitoring-table');
  }

  public get rulesUpdatesTable() {
    return this.page.testSubj.locator('rules-upgrades-table');
  }

  public get ruleSearchField() {
    return this.page.testSubj.locator('ruleSearchField');
  }

  public get selectAllRulesButton() {
    return this.page.testSubj.locator('selectAllRules');
  }

  public get selectAllRulesOnPageCheckbox() {
    return this.page.testSubj.locator('checkboxSelectAll');
  }

  public get selectedRulesLabel() {
    return this.page.testSubj.locator('selectedRules');
  }

  public get refreshRulesButton() {
    return this.page.testSubj.locator('refreshRulesAction-linkIcon');
  }

  public get rulesTableRefreshIndicator() {
    return this.page.testSubj.locator('loading-spinner');
  }

  public get rulesEmptyPrompt() {
    return this.page.testSubj.locator('rulesEmptyPrompt');
  }

  // ========================================
  // Locators - Tabs
  // ========================================

  public get managementTab() {
    return this.page.testSubj.locator('navigation-management');
  }

  public get monitoringTab() {
    return this.page.testSubj.locator('navigation-monitoring');
  }

  public get updatesTab() {
    return this.page.testSubj.locator('navigation-updates');
  }

  // ========================================
  // Locators - Filter Buttons
  // ========================================

  public get elasticRulesFilterButton() {
    return this.page.testSubj.locator('showElasticRulesFilterButton');
  }

  public get customRulesFilterButton() {
    return this.page.testSubj.locator('showCustomRulesFilterButton');
  }

  public get enabledRulesFilterButton() {
    return this.page.testSubj.locator('showEnabledRulesFilterButton');
  }

  public get disabledRulesFilterButton() {
    return this.page.testSubj.locator('showDisabledRulesFilterButton');
  }

  public get tagsFilterButton() {
    return this.page.testSubj.locator('tags-filter-popover-button');
  }

  public get tagsFilterPopover() {
    return this.page.testSubj.locator('tags-filter-popover');
  }

  // ========================================
  // Locators - Rule Actions
  // ========================================

  public get collapsedActionButton() {
    return this.page.testSubj.locator('euiCollapsedItemActionsButton');
  }

  public get editRuleActionButton() {
    return this.page.testSubj.locator('editRuleAction');
  }

  public get deleteRuleActionButton() {
    return this.page.testSubj.locator('deleteRuleAction');
  }

  public get duplicateRuleActionButton() {
    return this.page.testSubj.locator('duplicateRuleAction');
  }

  public get manualRuleRunActionButton() {
    return this.page.testSubj.locator('manualRuleRunAction');
  }

  public get exportRuleActionButton() {
    return this.page.testSubj.locator('exportRuleAction');
  }

  // ========================================
  // Locators - Modals & Confirmations
  // ========================================

  public get confirmDeleteRuleButton() {
    return this.page.testSubj
      .locator('deleteRulesConfirmationModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]');
  }

  public get confirmDuplicateRuleButton() {
    return this.page.testSubj.locator('confirmModalConfirmButton');
  }

  public get modalConfirmationButton() {
    return this.page.testSubj.locator('confirmModalConfirmButton');
  }

  public get modalCancelButton() {
    return this.page.testSubj.locator('confirmModalCancelButton');
  }

  public get modalBody() {
    return this.page.testSubj.locator('confirmModalBodyText');
  }

  // ========================================
  // Locators - Rule Row Elements
  // ========================================

  public get ruleRows() {
    return this.page.locator('.euiTableRow');
  }

  ruleCheckbox(ruleId: string) {
    return this.page.testSubj.locator(`checkboxSelectRow-${ruleId}`);
  }

  ruleName(ruleName: string) {
    return this.page.testSubj.locator('ruleName').filter({ hasText: ruleName });
  }

  ruleSwitch(index: number = 0) {
    // eslint-disable-next-line playwright/no-nth-methods
    return this.page.testSubj.locator('ruleSwitch').nth(index);
  }

  ruleSwitchLoader(index: number = 0) {
    // eslint-disable-next-line playwright/no-nth-methods
    return this.page.testSubj.locator('ruleSwitchLoader').nth(index);
  }

  // ========================================
  // Locators - Toast Messages
  // ========================================

  public get toastHeader() {
    return this.page.testSubj.locator('euiToastHeader');
  }

  public get successToastHeader() {
    return this.page.locator('[class*="euiToast-success"] [data-test-subj="euiToastHeader"]');
  }

  public get toastBody() {
    return this.page.testSubj.locator('globalToastList').locator('[data-test-subj="euiToastBody"]');
  }

  public get toastCloseButton() {
    return this.page.testSubj.locator('toastCloseButton');
  }

  // ========================================
  // Locators - Add Rules
  // ========================================

  public get addElasticRulesButton() {
    return this.page.testSubj.locator('addElasticRulesButton');
  }

  public get addElasticRulesEmptyPromptButton() {
    return this.page.testSubj.locator('add-elastc-rules-empty-empty-prompt-button');
  }

  // ========================================
  // Navigation
  // ========================================

  /**
   * Navigates to the Rules Management page
   */
  async navigate() {
    await this.page.gotoApp('security', { path: '/rules/management' });
    await this.page.waitForURL('**/app/security/rules/management**');
  }

  /**
   * Navigates to the Rules Management page and dismisses the onboarding tour if present
   */
  async navigateAndDismissOnboarding() {
    await this.navigate();
    await this.dismissOnboardingTour();
  }

  /**
   * Dismisses the onboarding tour modal if present
   * This modal may appear for first-time users
   */
  async dismissOnboardingTour() {
    await this.page
      .getByRole('button', { name: 'Close tour' })
      .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
      .catch(() => {
        // Modal not present, continue silently
      });
  }

  // ========================================
  // Tab Navigation
  // ========================================

  /**
   * Switches to the Management tab
   */
  async goToManagementTab() {
    await this.managementTab.click();
    await this.rulesManagementTable.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the Monitoring tab
   */
  async goToMonitoringTab() {
    await this.monitoringTab.click();
    await this.rulesMonitoringTable.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the Updates tab
   */
  async goToUpdatesTab() {
    await this.updatesTab.click();
    await this.rulesUpdatesTable.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  // ========================================
  // Rule Selection
  // ========================================

  /**
   * Selects a rule by its ID using the checkbox
   * @param ruleId - The rule ID returned from API
   */
  async selectRuleByCheckbox(ruleId: string) {
    const checkbox = this.ruleCheckbox(ruleId);
    await checkbox.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await checkbox.click();
  }

  /**
   * Selects a rule by its name
   * @param ruleName - The display name of the rule
   */
  async selectRuleByName(ruleName: string) {
    const rule = this.ruleName(ruleName);
    await rule.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await rule.click();
  }

  /**
   * Selects all rules on the current page
   */
  async selectAllRulesOnPage() {
    await this.selectAllRulesOnPageCheckbox.click();
  }

  /**
   * Selects all rules across all pages
   */
  async selectAllRules() {
    await this.selectAllRulesButton.click();
  }

  // ========================================
  // Rule Actions
  // ========================================

  /**
   * Enables or disables a rule by clicking its switch
   * @param index - The index of the rule in the table (0-based)
   */
  async toggleRuleSwitch(index: number = 0) {
    const ruleSwitch = this.ruleSwitch(index);
    await ruleSwitch.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await ruleSwitch.click();

    // Wait for the loader to appear and disappear
    const loader = this.ruleSwitchLoader(index);
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
    const firstButton = this.collapsedActionButton.first();
    await firstButton.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await firstButton.click();
  }

  /**
   * Edits the first rule in the table
   */
  async editFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.editRuleActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.editRuleActionButton.click();
  }

  /**
   * Duplicates the first rule in the table
   */
  async duplicateFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.duplicateRuleActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.duplicateRuleActionButton.click();
    await this.confirmDuplicateRuleButton.click();
  }

  /**
   * Deletes the first rule in the table
   */
  async deleteFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.deleteRuleActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.deleteRuleActionButton.click();
    await this.confirmDeleteRuleButton.click();
  }

  /**
   * Manually runs the first rule in the table
   */
  async manualRunFirstRule() {
    await this.openFirstRuleActionsMenu();
    await this.manualRuleRunActionButton.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await this.manualRuleRunActionButton.click();
  }

  // ========================================
  // Search and Filter
  // ========================================

  /**
   * Searches for rules by name or description
   * @param searchTerm - The text to search for
   */
  async searchRules(searchTerm: string) {
    await this.ruleSearchField.clear();
    await this.ruleSearchField.fill(searchTerm);
    // Wait for table to update
    await this.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only Elastic rules
   */
  async filterByElasticRules() {
    await this.elasticRulesFilterButton.click();
    await this.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only custom rules
   */
  async filterByCustomRules() {
    await this.customRulesFilterButton.click();
    await this.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only enabled rules
   */
  async filterByEnabledRules() {
    await this.enabledRulesFilterButton.click();
    await this.waitForRulesTableToLoad();
  }

  /**
   * Filters to show only disabled rules
   */
  async filterByDisabledRules() {
    await this.disabledRulesFilterButton.click();
    await this.waitForRulesTableToLoad();
  }

  /**
   * Opens the tags filter popover
   */
  async openTagsFilter() {
    await this.tagsFilterButton.click();
    await this.tagsFilterPopover.waitFor({
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
    await this.waitForRulesTableToLoad();
  }

  // ========================================
  // Table Interaction
  // ========================================

  /**
   * Waits for the rules table to finish loading
   */
  async waitForRulesTableToLoad() {
    // Wait for refresh indicator to appear
    await this.rulesTableRefreshIndicator
      .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_SHORT })
      .catch(() => {
        // Indicator might not appear if load is very fast
      });

    // Wait for refresh indicator to disappear
    await this.rulesTableRefreshIndicator.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG,
    });
  }

  /**
   * Refreshes the rules table
   */
  async refreshRulesTable() {
    await this.refreshRulesButton.click();
    await this.waitForRulesTableToLoad();
  }

  /**
   * Gets all rule rows from the current table
   * @returns Promise<Locator> of all rule rows
   */
  getRulesTableRows(): Locator {
    return this.rulesManagementTable.locator('.euiTableRow');
  }

  /**
   * Gets the count of visible rules in the table
   */
  async getRulesCount(): Promise<number> {
    const rows = this.getRulesTableRows();
    return rows.count();
  }

  // ========================================
  // Assertion Methods
  // ========================================

  /**
   * Asserts that a specific number of rules are displayed
   * @param expectedCount - The expected number of rules
   */
  async expectRulesCount(expectedCount: number) {
    const rows = this.getRulesTableRows();
    await expect(rows).toHaveCount(expectedCount);
  }

  /**
   * Asserts that a rule with the given name is visible
   * @param ruleName - The name of the rule to check
   */
  async expectRuleVisible(ruleName: string) {
    const rule = this.ruleName(ruleName);
    await expect(rule).toBeVisible();
  }

  /**
   * Asserts that a rule with the given name is not visible
   * @param ruleName - The name of the rule to check
   */
  async expectRuleNotVisible(ruleName: string) {
    const rule = this.ruleName(ruleName);
    await expect(rule).toBeHidden();
  }

  /**
   * Asserts that the empty state is visible
   */
  async expectEmptyState() {
    await expect(this.rulesEmptyPrompt).toBeVisible();
  }

  /**
   * Asserts the number of selected rules
   * @param count - Expected count of selected rules
   */
  async expectSelectedRulesCount(count: number) {
    await expect(this.selectedRulesLabel).toContainText(`${count}`);
  }

  /**
   * Asserts that a success toast with the given message is visible
   * @param message - The expected toast message
   */
  async expectSuccessToast(message: string) {
    await expect(this.successToastHeader).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await expect(this.toastBody).toContainText(message);
  }

  /**
   * Dismisses all toast notifications
   */
  async dismissToasts() {
    const toastButtons = this.toastCloseButton;
    const count = await toastButtons.count();

    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line playwright/no-nth-methods
      const button = toastButtons.nth(i);
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
      }
    }
  }
}
