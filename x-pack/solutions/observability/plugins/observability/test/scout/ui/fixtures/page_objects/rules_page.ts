/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import {
  RULES_SETTINGS_TEST_SUBJECTS,
  RULE_TYPE_MODAL_TEST_SUBJECTS,
  RULE_LIST_TEST_SUBJECTS,
  LOGS_TAB_TEST_SUBJECTS,
  CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS,
  BIGGER_TIMEOUT,
  SHORTER_TIMEOUT,
} from '../constants';

export class RulesPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigates to the rules list page (Observability)
   */
  async goto(ruleId: string = '') {
    await this.page.gotoApp(`observability/alerts/rules/${ruleId}`);
    if (!ruleId) {
      await this.page.testSubj.waitForSelector(RULES_SETTINGS_TEST_SUBJECTS.RULE_PAGE_TAB, {
        timeout: BIGGER_TIMEOUT,
      });
    }
  }

  /**
   * Gets the page title/tab locator
   */
  public get pageTitle() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULE_PAGE_TAB);
  }

  // Rules Settings Flyout methods
  /**
   * Gets the settings link button locator
   */
  public get settingsLink() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_LINK);
  }

  /**
   * Gets the rules settings flyout locator
   */
  public get settingsFlyout() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT);
  }

  /**
   * Gets the flyout cancel button locator
   */
  public get settingsFlyoutCancelButton() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT_CANCEL_BUTTON
    );
  }

  /**
   * Gets the flyout save button locator
   */
  public get settingsFlyoutSaveButton() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT_SAVE_BUTTON
    );
  }

  /**
   * Clicks the settings link to open the flyout
   */
  async openSettingsFlyout() {
    await expect(this.settingsLink).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.settingsLink.click();
    await expect(this.settingsFlyout).toBeVisible();
  }

  /**
   * Verifies the settings flyout is visible with expected elements
   */
  async expectSettingsFlyoutVisible() {
    await expect(this.settingsFlyout).toBeVisible();
    await expect(this.settingsFlyoutCancelButton).toBeVisible();
    await expect(this.settingsFlyoutSaveButton).toBeVisible();
  }

  /**
   * Closes the settings flyout by clicking the cancel button
   */
  async closeSettingsFlyout() {
    await this.settingsFlyoutCancelButton.click();
    await expect(this.settingsFlyout).toBeHidden();
  }

  // Rule Type Modal methods
  /**
   * Gets the create rule button locator
   */
  public get createRuleButton() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.CREATE_RULE_BUTTON);
  }

  /**
   * Gets the rule type modal locator
   */
  public get ruleTypeModal() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.RULE_TYPE_MODAL);
  }

  /**
   * Gets the search input locator
   */
  public get ruleTypeModalSearch() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.RULE_TYPE_MODAL_SEARCH);
  }

  /**
   * Gets the "All" filter button locator
   */
  public get allRuleTypesButton() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.ALL_RULE_TYPES_BUTTON);
  }

  /**
   * Clicks the create rule button to open the modal
   */
  async openRuleTypeModal() {
    await expect(this.createRuleButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.createRuleButton.click();
    await expect(this.ruleTypeModal).toBeVisible();
  }

  /**
   * Closes the rule type modal by pressing ESC
   */
  async closeRuleTypeModal() {
    await this.page.keyboard.press('Escape');
    await expect(this.ruleTypeModal).toBeHidden({ timeout: SHORTER_TIMEOUT });
  }

  /**
   * Gets the Rules Table container locator
   */
  public get rulesTableContainer() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_TABLE_CONTAINER);
  }

  /**
   * Gets the inner Rules Table locator
   */
  public get rulesTable() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_TABLE);
  }

  /**
   * Gets the non-editable rules locator
   */
  public getNonEditableRules() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULE_ROW_NON_EDITABLE);
  }

  /**
   * Gets the editable rules locator
   */
  public getEditableRules() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULE_ROW);
  }

  /**
   * Gets the rule sidebar edit action locator for a specific rule
   * Pass the rule row locator to find the edit button within that row
   */
  public getRuleSidebarEditAction(ruleRow: ReturnType<typeof this.page.testSubj.locator>) {
    return ruleRow.locator(
      `[data-test-subj="${RULE_LIST_TEST_SUBJECTS.RULE_SIDEBAR_EDIT_ACTION}"]`
    );
  }

  /**
   * Gets the edit action hover button locator for a specific rule
   */
  public getEditActionButton(ruleRow: ReturnType<typeof this.page.testSubj.locator>) {
    return ruleRow.locator(
      `[data-test-subj="${RULE_LIST_TEST_SUBJECTS.EDIT_ACTION_HOVER_BUTTON}"]`
    );
  }

  // Logs Tab methods
  /**
   * Gets the logs tab button locator
   */
  public get logsTab() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.LOGS_TAB);
  }

  /**
   * Gets the event log table container locator
   */
  public get eventLogTable() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE);
  }

  /**
   * Navigates to the logs tab page via URL
   */
  async gotoLogsTab() {
    await this.page.gotoApp('observability/alerts/rules/logs');
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  /**
   * Clicks the logs tab to navigate to it
   */
  async clickLogsTab() {
    await expect(this.logsTab).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.logsTab.click();
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  async waitForLogsTableToLoad() {
    const loadingIndicators = await this.eventLogTable
      .getByRole('progressbar', { name: 'Loading' })
      .all();
    for await (const indicator of loadingIndicators) {
      await expect(indicator).toBeHidden({ timeout: BIGGER_TIMEOUT });
    }
  }

  /**
   * Verifies the logs tab is active/selected
   */
  async expectLogsTabActive() {
    await expect(this.logsTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Gets the rule details page locator
   */
  public get ruleDetails() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.RULE_DETAILS);
  }

  /**
   * Gets the editable rules locator
   */
  public async getLogsTableRuleLinks(ruleName: string) {
    return this.eventLogTable.getByRole('button', { name: ruleName }).all();
  }

  /**
   * Clicks on a rule in the event logs table by its name
   */
  async clickOnRuleInEventLogs(ruleLog: Locator) {
    await ruleLog.click();
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.RULE_DETAILS, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  /**
   * Gets the rule search field locator
   */
  public get ruleSearchField() {
    return this.page.testSubj.locator('ruleSearchField');
  }

  // Edit Rule Flyout methods

  /**
   * Verifies that the edit action button is visible for a specific rule
   */
  async expectEditActionVisible(ruleName: string) {
    const editableRules = this.getEditableRules();
    const ruleRow = editableRules.filter({ hasText: ruleName });
    // Hover over the rule row to make the edit button visible
    await ruleRow.hover();
    // Verify the edit action container is present
    const editActionContainer = this.getRuleSidebarEditAction(ruleRow);
    await expect(editActionContainer).toBeVisible();
    // Verify the edit button itself is visible
    const editButton = this.getEditActionButton(ruleRow);
    await expect(editButton).toBeVisible();
  }
  /**
   * Gets the rules edit flyout locator
   */
  public get editRuleFlyout() {
    return this.page.getByText('Edit Rule');
  }

  /**
   * Gets the flyout cancel button locator
   */
  public get editRuleFlyoutCancelButton() {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Gets the flyout save button locator
   */
  public get editRuleFlyoutSaveButton() {
    return this.page.getByRole('button', { name: 'Save changes' });
  }
  /**
   * Opens the edit rule flyout by clicking the edit button for a specific rule
   */
  async openEditRuleFlyout(ruleName: string) {
    await this.expectEditActionVisible(ruleName);
    await this.getEditActionButton(this.getEditableRules().filter({ hasText: ruleName })).click();
    await expect(this.editRuleFlyout).toBeVisible();
  }

  /**
   * Verifies the edit rule flyout is visible with expected elements
   */
  async expectEditRuleFlyoutVisible() {
    await expect(this.editRuleFlyout).toBeVisible();
    await expect(this.editRuleFlyoutCancelButton).toBeVisible();
    await expect(this.editRuleFlyoutSaveButton).toBeVisible();
  }

  /**
   * Closes the edit rule flyout by clicking the cancel button
   */
  async closeEditRuleFlyout() {
    await this.editRuleFlyoutCancelButton.click();
    await expect(this.editRuleFlyout).toBeHidden({ timeout: SHORTER_TIMEOUT });
  }

  // Custom Threshold Rule Creation methods

  /**
   * Gets the custom threshold rule type card
   */
  public get customThresholdRuleTypeCard() {
    return this.page.testSubj.locator(
      CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CUSTOM_THRESHOLD_RULE_TYPE_CARD
    );
  }

  /**
   * Gets the rule form locator
   */
  public get ruleForm() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_FORM);
  }

  /**
   * Gets the rule name input field
   */
  public get ruleNameInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_NAME_INPUT);
  }

  /**
   * Gets the data view expression button
   */
  public get dataViewExpression() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.DATA_VIEW_EXPRESSION);
  }

  /**
   * Gets the index pattern switcher input
   */
  public get indexPatternInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.INDEX_PATTERN_INPUT);
  }

  /**
   * Gets the explore matching indices button
   */
  public get exploreMatchingIndicesButton() {
    return this.page.testSubj.locator(
      CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.EXPLORE_MATCHING_INDICES_BUTTON
    );
  }

  /**
   * Gets the rule save button
   */
  public get ruleSaveButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_SAVE_BUTTON);
  }

  /**
   * Gets the confirm modal confirm button
   */
  public get confirmModalButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CONFIRM_MODAL_BUTTON);
  }

  /**
   * Clicks the custom threshold rule type card
   */
  async clickCustomThresholdRuleType() {
    await expect(this.customThresholdRuleTypeCard).toBeVisible({ timeout: BIGGER_TIMEOUT });
    await this.customThresholdRuleTypeCard.click();
    await expect(this.ruleForm).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  /**
   * Sets the rule name
   */
  async setRuleName(name: string) {
    await expect(this.ruleNameInput).toBeVisible();
    // Clear existing value
    await this.ruleNameInput.fill('');
    await this.ruleNameInput.fill(name);
  }

  /**
   * Sets the index pattern and waits for the explore matching indices button
   */
  async setIndexPatternAndWaitForButton(pattern: string) {
    await this.dataViewExpression.click();
    await expect(this.indexPatternInput).toBeVisible();
    await this.indexPatternInput.fill(pattern);
    // Wait for debounce and button to appear
    await expect(this.exploreMatchingIndicesButton).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  /**
   * Clicks the explore matching indices button to create ad-hoc data view
   */
  async clickExploreMatchingIndices() {
    await this.exploreMatchingIndicesButton.click();
    // Wait for data view to be selected
    await expect(this.dataViewExpression).toContainText('.alerts-*', { timeout: SHORTER_TIMEOUT });
  }

  /**
   * Waits for the form to be ready after data view changes
   */
  async waitForFormReady() {
    // Ensure save button is enabled (form is valid)
    await expect(this.ruleSaveButton).toBeEnabled({ timeout: SHORTER_TIMEOUT });
  }

  /**
   * Saves the rule by clicking save and confirming
   */
  async saveRule() {
    // Scroll the save button into view to ensure it's accessible
    await this.ruleSaveButton.scrollIntoViewIfNeeded();

    // Click the save button
    await this.ruleSaveButton.click();

    await expect(this.confirmModalButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.confirmModalButton.click();
    // Wait for navigation to rule details page
    await expect(this.ruleDetails).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  public get observabilityCategory() {
    return this.ruleTypeModal.locator('.euiFacetButton[title="Observability"]');
  }

  // Rule Status Dropdown methods

  /**
   * Gets the rule status dropdown button for a specific rule row
   */
  public getRuleStatusDropdown(ruleRow: Locator) {
    return ruleRow.locator(`[data-test-subj="${RULE_LIST_TEST_SUBJECTS.STATUS_DROPDOWN}"]`);
  }

  /**
   * Gets the disable option in the status dropdown menu
   */
  public get disableDropdownItem() {
    return this.page.testSubj.locator(RULE_LIST_TEST_SUBJECTS.STATUS_DROPDOWN_DISABLED_ITEM);
  }

  /**
   * Gets the enable option in the status dropdown menu
   */
  public get enableDropdownItem() {
    return this.page.testSubj.locator(RULE_LIST_TEST_SUBJECTS.STATUS_DROPDOWN_ENABLED_ITEM);
  }

  /**
   * Clicks the rule status dropdown menu for a rule by name
   */
  async clickRuleStatusDropDownMenu(ruleName: string) {
    const ruleRow = this.getRuleRowByName(ruleName);
    const statusDropdown = this.getRuleStatusDropdown(ruleRow);
    await expect(statusDropdown).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await statusDropdown.click();
  }

  /**
   * Clicks the disable option from the dropdown menu
   */
  async clickDisableFromDropDownMenu() {
    await expect(this.disableDropdownItem).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.disableDropdownItem.click();
  }

  /**
   * Clicks the enable option from the dropdown menu
   */
  async clickEnableFromDropDownMenu() {
    await expect(this.enableDropdownItem).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.enableDropdownItem.click();
  }

  /**
   * Gets a rule row by name
   */
  public getRuleRowByName(ruleName: string) {
    return this.getEditableRules().filter({ hasText: ruleName });
  }

  /**
   * Gets the status button for a specific rule by name
   */
  public getRuleStatusButton(ruleName: string) {
    const ruleRow = this.getRuleRowByName(ruleName);
    return ruleRow.locator(`[data-test-subj="${RULE_LIST_TEST_SUBJECTS.RULES_TABLE_CELL_STATUS}"]`);
  }

  /**
   * Disables a rule by its name
   */
  async disableRule(ruleName: string) {
    const ruleRow = this.getRuleRowByName(ruleName);
    await expect(ruleRow).toBeVisible({ timeout: SHORTER_TIMEOUT });
    const statusDropdown = this.getRuleStatusDropdown(ruleRow);
    await expect(statusDropdown).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await statusDropdown.click();
    await this.clickDisableFromDropDownMenu();

    await expect(this.confirmModalButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.confirmModalButton.click();

    await expect(statusDropdown).toHaveAttribute('title', 'Disabled', { timeout: BIGGER_TIMEOUT });
  }

  /**
   * Verifies that a rule's status is "Disabled"
   */
  async expectRuleToBeDisabled(ruleName: string) {
    const ruleRow = this.getRuleRowByName(ruleName);
    const statusDropdown = this.getRuleStatusDropdown(ruleRow);
    await expect(statusDropdown).toHaveAttribute('title', 'Disabled', { timeout: BIGGER_TIMEOUT });
  }

  /**
   * Verifies that a rule's status is "Enabled"
   */
  async expectRuleToBeEnabled(ruleName: string) {
    const ruleRow = this.getRuleRowByName(ruleName);
    const statusDropdown = this.getRuleStatusDropdown(ruleRow);
    await expect(statusDropdown).toHaveAttribute('title', 'Enabled', { timeout: BIGGER_TIMEOUT });
  }
}
