/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import {
  RULES_SETTINGS_TEST_SUBJECTS,
  RULE_TYPE_MODAL_TEST_SUBJECTS,
  LOGS_TAB_TEST_SUBJECTS,
} from '../constants';

export class RulesPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigates to the rules list page (Observability)
   */
  async goto() {
    await this.page.gotoApp('observability/alerts/rules');
    await this.page.testSubj.waitForSelector(RULES_SETTINGS_TEST_SUBJECTS.RULE_PAGE_TAB, {
      timeout: 100000,
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
    await expect(this.settingsLink).toBeVisible({ timeout: 5000 });
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
   * Gets a producer filter button locator
   */
  getProducerFilterButton(producer: string) {
    return this.page.testSubj.locator(`${producer}-LeftSidebarSelectOption`);
  }

  /**
   * Gets a rule type card locator
   */
  getRuleTypeCard(ruleTypeId: string) {
    return this.page.testSubj.locator(`${ruleTypeId}-SelectOption`);
  }

  /**
   * Clicks the create rule button to open the modal
   */
  async openRuleTypeModal() {
    await expect(this.createRuleButton).toBeVisible({ timeout: 5000 });
    await this.createRuleButton.click();
    await expect(this.ruleTypeModal).toBeVisible();
  }

  /**
   * Verifies the rule type modal is visible with expected elements
   */
  async expectRuleTypeModalVisible() {
    await expect(this.ruleTypeModal).toBeVisible();
    await expect(this.ruleTypeModalSearch).toBeVisible();
    await expect(this.allRuleTypesButton).toBeVisible();
  }

  /**
   * Verifies the "All" button shows the expected total count
   */
  async expectAllRuleTypesCount(expectedCount: number) {
    await expect(this.allRuleTypesButton).toContainText(expectedCount.toString());
  }

  /**
   * Closes the rule type modal by pressing ESC
   */
  async closeRuleTypeModal() {
    await this.page.keyboard.press('Escape');
    await expect(this.ruleTypeModal).toBeHidden({ timeout: 5000 });
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
   * Gets the date picker locator
   */
  public get datePicker() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.DATE_PICKER);
  }

  /**
   * Gets the status filter button locator
   */
  public get statusFilter() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.STATUS_FILTER);
  }

  /**
   * Gets the loading indicator locator
   */
  public get loadingIndicator() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.LOADING_INDICATOR);
  }

  /**
   * Gets the rule details page locator
   */
  public get ruleDetails() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.RULE_DETAILS);
  }

  /**
   * Navigates to the logs tab page via URL
   */
  async gotoLogsTab() {
    await this.page.gotoApp('observability/alerts/rules/logs');
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE, {
      timeout: 30000,
    });
  }

  /**
   * Clicks the logs tab to navigate to it
   */
  async clickLogsTab() {
    await expect(this.logsTab).toBeVisible({ timeout: 5000 });
    await this.logsTab.click();
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE, {
      timeout: 30000,
    });
  }

  /**
   * Verifies the logs tab is active/selected
   */
  async expectLogsTabActive() {
    await expect(this.logsTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Verifies the event log content is loaded and visible
   */
  async expectLogsContentLoaded() {
    await expect(this.eventLogTable).toBeVisible({ timeout: 30000 });
  }

  /**
   * Verifies all main sections of the logs tab are visible
   */
  async expectLogsTabSectionsVisible() {
    await expect(this.eventLogTable).toBeVisible();
    await expect(this.datePicker).toBeVisible();
    await expect(this.statusFilter).toBeVisible();
  }

  /**
   * Gets all rule name links in the event log table
   */
  getRuleNameLinks() {
    return this.page.locator('[data-test-subj="ruleEventLogListTable"] a');
  }

  /**
   * Clicks the date picker button to open the date picker popover
   */
  async openDatePicker() {
    await expect(this.datePicker).toBeVisible();
    await this.datePicker.click();
  }

  /**
   * Clicks the status filter button to open the status filter dropdown
   */
  async openStatusFilter() {
    await expect(this.statusFilter).toBeVisible();
    await this.statusFilter.click();
  }

  /**
   * Gets the empty state message locator
   */
  public get emptyStateMessage() {
    return this.page.locator('[data-test-subj="ruleEventLogEmptyPrompt"]');
  }

  /**
   * Gets the table rows in the event log
   */
  getEventLogTableRows() {
    return this.page.locator('[data-test-subj="ruleEventLogListTable"] .euiDataGridRow');
  }

  /**
   * Counts the number of visible rows in the event log table
   */
  async getEventLogRowCount(): Promise<number> {
    const rows = this.getEventLogTableRows();
    return rows.count();
  }
}
