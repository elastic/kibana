/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Locators for the Rules Management Page Object
 *
 * This class contains all the selectors used to interact with the Rules Management page.
 * Locators are organized by feature domain for better maintainability.
 */
export class RulesManagementLocators {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Main Elements
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
  // Tabs
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
  // Filter Buttons
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
  // Rule Actions
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
  // Modals & Confirmations
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
  // Rule Row Elements
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
  // Toast Messages
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
  // Add Rules
  // ========================================

  public get addElasticRulesButton() {
    return this.page.testSubj.locator('addElasticRulesButton');
  }

  public get addElasticRulesEmptyPromptButton() {
    return this.page.testSubj.locator('add-elastc-rules-empty-empty-prompt-button');
  }
}
