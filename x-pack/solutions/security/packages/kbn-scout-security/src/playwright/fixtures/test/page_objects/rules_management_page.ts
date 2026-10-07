/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

/**
 * Detection rules management page (`/security/rules/management`): the rules table, its row
 * actions and its bulk actions.
 */
export class RulesManagementPage {
  readonly table: Locator;
  readonly customRulesFilter: Locator;
  readonly selectAllButton: Locator;
  readonly bulkActionsButton: Locator;
  readonly duplicateBulkAction: Locator;
  readonly duplicateWithExceptionsOption: Locator;
  readonly confirmModalButton: Locator;
  readonly rowActionsButton: Locator;
  readonly duplicateRowAction: Locator;
  readonly autoRefreshButton: Locator;
  readonly autoRefreshSwitch: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('rules-management-table');
    this.customRulesFilter = this.page.testSubj.locator('showCustomRulesFilterButton');
    this.selectAllButton = this.page.testSubj.locator('selectAllRules');
    this.bulkActionsButton = this.page.testSubj.locator('bulkActions');
    this.duplicateBulkAction = this.page.testSubj.locator('duplicateRuleBulk');
    this.duplicateWithExceptionsOption = this.page.testSubj
      .locator('withExceptions')
      .locator('label');
    this.confirmModalButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.rowActionsButton = this.page.testSubj.locator('euiCollapsedItemActionsButton');
    this.duplicateRowAction = this.page.testSubj.locator('duplicateRuleAction');
    this.autoRefreshButton = this.page.testSubj.locator('autoRefreshButton');
    this.autoRefreshSwitch = this.page.testSubj.locator('refreshSettingsSwitch');
  }

  async goto(params: { kbnUrl: KibanaUrl; spaceId: string }): Promise<void> {
    const { kbnUrl, spaceId } = params;
    await this.page.goto(kbnUrl.app('security/rules/management', { space: spaceId }));
    await this.table.waitFor({ state: 'visible' });
  }

  /** The table row of the rule with the given name. */
  ruleRow(ruleName: string): Locator {
    return this.table.getByRole('row').filter({ hasText: ruleName });
  }

  ruleNameLink(ruleName: string): Locator {
    return this.ruleRow(ruleName).locator('[data-test-subj="ruleName"]');
  }

  ruleSwitch(ruleName: string): Locator {
    return this.ruleRow(ruleName).locator('[data-test-subj="ruleSwitch"]');
  }

  /** Turns the table auto refresh off so rows do not re-render while the test acts on them. */
  async disableAutoRefresh(): Promise<void> {
    await this.autoRefreshButton.click();
    await this.autoRefreshSwitch.click();
    // Close the popover again
    await this.page.keyboard.press('Escape');
  }

  async openRuleDetails(ruleName: string): Promise<void> {
    await this.ruleNameLink(ruleName).click();
  }

  /** Duplicates a rule from its row actions menu and confirms the dialog. */
  async duplicateRuleFromRowActions(ruleName: string): Promise<void> {
    await this.ruleRow(ruleName).locator(this.rowActionsButton).click();
    await this.duplicateRowAction.click();
    await this.confirmModalButton.click();
  }

  /** Selects every rule and duplicates them, with their exceptions, from the bulk actions menu. */
  async duplicateAllRulesWithExceptions(): Promise<void> {
    await this.selectAllButton.click();
    await this.bulkActionsButton.click();
    await this.duplicateBulkAction.click();
    await this.duplicateWithExceptionsOption.click();
    await this.confirmModalButton.click();
  }
}
