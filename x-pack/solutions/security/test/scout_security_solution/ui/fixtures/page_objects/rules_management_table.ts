/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class RulesManagementTablePage {
  readonly rulesTable: Locator;
  readonly ruleSwitch: Locator;
  readonly ruleName: Locator;
  readonly ruleSearchField: Locator;
  readonly elasticRulesBtn: Locator;
  readonly customRulesBtn: Locator;
  readonly selectAllRulesBtn: Locator;
  readonly bulkActionsBtn: Locator;
  readonly collapsedActionBtn: Locator;
  readonly rulesRow: Locator;
  readonly autoRefreshPopoverTrigger: Locator;
  readonly refreshSettingsSwitch: Locator;
  readonly rulesMonitoringTab: Locator;
  readonly rulesTagsFilterBtn: Locator;
  readonly rulesTagsFilterPopover: Locator;
  readonly executionStatusFilterButton: Locator;
  readonly executionStatusFilterOption: Locator;
  readonly ruleExecutionStatusBadge: Locator;
  readonly rulesEmptyPrompt: Locator;
  readonly addElasticRulesBtn: Locator;
  readonly tableSortColumnBtn: Locator;
  readonly tablePerPagePopoverBtn: Locator;

  constructor(private readonly page: ScoutPage) {
    this.rulesTable = this.page.testSubj.locator('rules-management-table');
    this.ruleSwitch = this.page.testSubj.locator('ruleSwitch');
    this.ruleName = this.page.testSubj.locator('ruleName');
    this.ruleSearchField = this.page.testSubj.locator('ruleSearchField');
    this.elasticRulesBtn = this.page.testSubj.locator('showElasticRulesFilterButton');
    this.customRulesBtn = this.page.testSubj.locator('showCustomRulesFilterButton');
    this.selectAllRulesBtn = this.page.testSubj.locator('selectAllRules');
    this.bulkActionsBtn = this.page.testSubj.locator('bulkActions');
    this.collapsedActionBtn = this.page.testSubj.locator('euiCollapsedItemActionsButton');
    this.rulesRow = this.page.locator('.euiTableRow');
    this.autoRefreshPopoverTrigger = this.page.testSubj.locator('autoRefreshButton');
    this.refreshSettingsSwitch = this.page.testSubj.locator('refreshSettingsSwitch');
    this.rulesMonitoringTab = this.page.testSubj.locator('navigation-monitoring');
    this.rulesTagsFilterBtn = this.page.testSubj.locator('tags-filter-popover-button');
    this.rulesTagsFilterPopover = this.page.testSubj.locator('tags-filter-popover');
    this.executionStatusFilterButton = this.page.testSubj.locator('executionStatusFilterButton');
    this.executionStatusFilterOption = this.page.testSubj.locator('executionStatusFilterOption');
    this.ruleExecutionStatusBadge = this.page.testSubj.locator('ruleExecutionStatus');
    this.rulesEmptyPrompt = this.page.testSubj.locator('rulesEmptyPrompt');
    this.addElasticRulesBtn = this.page.testSubj.locator('addElasticRulesButton');
    this.tableSortColumnBtn = this.page.testSubj.locator('tableHeaderSortButton');
    this.tablePerPagePopoverBtn = this.page.testSubj
      .locator('tablePaginationPopoverButton')
      .first();
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('security/rules/management');
  }

  async waitForTableToLoad(): Promise<void> {
    await this.rulesTable.waitFor({ state: 'visible', timeout: 60_000 });
    const spinner = this.page.testSubj.locator('loading-spinner');
    await spinner.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  }

  async getTableRows(): Promise<Locator> {
    return this.rulesTable.locator('.euiTableRow');
  }

  async enableRuleAtPosition(index: number): Promise<void> {
    await this.ruleSwitch.nth(index).click();
  }

  async sortByColumn(columnName: string, direction: 'asc' | 'desc' = 'asc'): Promise<void> {
    const btn = this.tableSortColumnBtn.filter({ hasText: columnName }).first();
    await btn.click();
    if (direction === 'desc') {
      await btn.click();
    }
  }

  async setRowsPerPage(count: number): Promise<void> {
    await this.tablePerPagePopoverBtn.click();
    const option = this.page.locator(`button:has-text("${count} rows")`).first();
    await option.click();
  }

  async goToPage(pageNumber: number): Promise<void> {
    const pageBtn = this.page.locator(`button:has-text("${pageNumber}")`).last();
    await pageBtn.click();
  }

  async filterBySearchTerm(term: string): Promise<void> {
    await this.ruleSearchField.fill(term);
    await this.ruleSearchField.press('Enter');
  }

  async filterByTags(tags: string[]): Promise<void> {
    await this.rulesTagsFilterBtn.click();
    for (const tag of tags) {
      await this.rulesTagsFilterPopover.locator(`text=${tag}`).first().click();
    }
    await this.rulesTagsFilterBtn.click();
  }

  async filterByExecutionStatus(status: string): Promise<void> {
    await this.executionStatusFilterButton.click();
    await this.executionStatusFilterOption.filter({ hasText: status }).first().click();
  }

  async disableAutoRefresh(): Promise<void> {
    await this.autoRefreshPopoverTrigger.click();
    const switchEl = this.refreshSettingsSwitch;
    const checked = await switchEl.getAttribute('aria-checked');
    if (checked === 'true') {
      await switchEl.click();
    }
    await this.autoRefreshPopoverTrigger.click();
  }

  async selectAllRules(): Promise<void> {
    await this.selectAllRulesBtn.locator('text=Select all').first().click();
  }

  async selectRuleByName(ruleName: string): Promise<void> {
    const row = this.rulesTable.locator('.euiTableRow').filter({ hasText: ruleName }).first();
    const checkbox = row.locator('.euiCheckbox__input');
    await checkbox.check();
  }

  async selectRulesByName(ruleNames: string[]): Promise<void> {
    for (const name of ruleNames) {
      await this.selectRuleByName(name);
    }
  }

  async clickRowActions(ruleName: string): Promise<void> {
    const row = this.rulesTable.locator('.euiTableRow').filter({ hasText: ruleName }).first();
    await row.locator(this.collapsedActionBtn).first().click();
  }

  async deleteFirstRule(): Promise<void> {
    await this.collapsedActionBtn.first().click();
    await this.page.testSubj.locator('deleteRuleAction').first().click();
    await this.page.testSubj
      .locator('deleteRulesConfirmationModal')
      .locator('confirmModalConfirmButton')
      .first()
      .click();
  }

  async deleteSelectedRules(): Promise<void> {
    await this.bulkActionsBtn.click();
    await this.page.testSubj.locator('deleteRuleBulk').first().click();
    await this.page.testSubj
      .locator('deleteRulesConfirmationModal')
      .locator('confirmModalConfirmButton')
      .first()
      .click();
  }

  async getRulesManagementTableRowCount(): Promise<number> {
    return this.rulesTable.locator('.euiTableRow').count();
  }

  async getRuleExecutionStatusBadgeCount(): Promise<number> {
    return this.ruleExecutionStatusBadge.count();
  }

  async getRuleExecutionStatusBadgeCountByStatus(status: string): Promise<number> {
    return this.ruleExecutionStatusBadge.filter({ hasText: status }).count();
  }

  async deleteSelectedRules(): Promise<void> {
    await this.bulkActionsBtn.click();
    await this.page.testSubj.locator('deleteRuleBulk').first().click();
    await this.page.testSubj
      .locator('deleteRulesConfirmationModal')
      .locator('confirmModalConfirmButton')
      .first()
      .click();
  }

  async getRulesManagementTableRowCount(): Promise<number> {
    return this.rulesTable.locator('.euiTableRow').count();
  }

  async getRuleExecutionStatusBadgeCount(): Promise<number> {
    return this.ruleExecutionStatusBadge.count();
  }

  async getRuleExecutionStatusBadgeCountByStatus(status: string): Promise<number> {
    return this.ruleExecutionStatusBadge.filter({ hasText: status }).count();
  }

  async waitForRuleToUpdate(): Promise<void> {
    const loader = this.page.testSubj.locator('ruleSwitchLoader');
    await loader.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    await loader.waitFor({ state: 'hidden', timeout: 300_000 });
  }
}
