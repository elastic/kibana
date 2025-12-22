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
  BIGGER_TIMEOUT,
  SHORTER_TIMEOUT,
} from '../constants';

export class RulesPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigates to the rules list page (Observability)
   */
  async goto() {
    await this.page.gotoApp('observability/alerts/rules');
    await this.page.testSubj.waitForSelector(RULES_SETTINGS_TEST_SUBJECTS.RULE_PAGE_TAB, {
      timeout: BIGGER_TIMEOUT,
    });
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
}
