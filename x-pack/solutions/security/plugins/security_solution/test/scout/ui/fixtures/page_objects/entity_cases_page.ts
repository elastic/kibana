/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Page object for entity attachment Cases UI interactions:
 * - Entity flyout Take Action popover (Add to new/existing case)
 * - Cases new-case creation flyout
 * - Case view Entities tab
 */
export class EntityCasesPage {
  // Alerts table (used to scope entity link lookups to a specific alert row)
  public readonly alertsTable: Locator;

  // Entity flyout – Take Action popover
  public readonly takeActionButton: Locator;
  public readonly addToNewCaseItem: Locator;
  public readonly addToExistingCaseItem: Locator;

  // Case view – Entities tab
  public readonly entitiesTab: Locator;
  public readonly entityTabTable: Locator;
  public readonly entityTabEmpty: Locator;

  // New-case creation flyout (rendered by the Cases plugin)
  public readonly createCaseNameInput: Locator;
  public readonly createCaseSubmitButton: Locator;

  // Toast link that navigates to the newly created case
  public readonly caseToastLink: Locator;

  constructor(private readonly page: ScoutPage) {
    this.alertsTable = page.testSubj.locator('alertsTableIsLoaded');

    this.takeActionButton = page.testSubj.locator('take-action-button');
    this.addToNewCaseItem = page.testSubj.locator('eaCasesAddToNewCase');
    this.addToExistingCaseItem = page.testSubj.locator('eaCasesAddToExistingCase');

    this.entitiesTab = page.testSubj.locator('case-view-tab-title-entities');
    this.entityTabTable = page.testSubj.locator('eaCasesEntityTabTable');
    this.entityTabEmpty = page.testSubj.locator('eaCasesEntityTabEmpty');

    this.createCaseNameInput = page.locator(
      'input[data-test-subj="input"][aria-label*="Case name"]'
    );
    this.createCaseSubmitButton = page.testSubj.locator('create-case-submit');

    this.caseToastLink = page.locator('[data-test-subj*="toastLink"]');
  }

  async navigateToAlerts() {
    await this.page.gotoApp('security/alerts');
  }

  async openHostFlyoutForRule(ruleName: string) {
    await this.alertsTable.waitFor({ state: 'visible' });
    const row = this.alertsTable
      .getByTestId('ruleName')
      .filter({ hasText: ruleName })
      .locator('xpath=ancestor::div[contains(@class,"euiDataGridRow")]');
    await row.getByTestId('host-details-button').click();
  }

  async openUserFlyoutForRule(ruleName: string) {
    await this.alertsTable.waitFor({ state: 'visible' });
    const row = this.alertsTable
      .getByTestId('ruleName')
      .filter({ hasText: ruleName })
      .locator('xpath=ancestor::div[contains(@class,"euiDataGridRow")]');
    await row.getByTestId('users-link').click();
  }

  async openTakeActionMenu() {
    await this.takeActionButton.waitFor();
    await this.takeActionButton.click();
  }

  async clickAddToNewCase() {
    await this.addToNewCaseItem.click();
  }

  async clickAddToExistingCase() {
    await this.addToExistingCaseItem.click();
  }

  async fillCaseName(name: string) {
    await this.createCaseNameInput.waitFor();
    await this.createCaseNameInput.fill(name);
  }

  async submitNewCase() {
    await this.createCaseSubmitButton.click();
  }

  async navigateToCase(caseId: string) {
    await this.page.gotoApp(`security/cases/${caseId}`);
  }

  async clickEntitiesTab() {
    await this.entitiesTab.click();
  }

  async clickCaseToastLink() {
    await this.caseToastLink.click();
  }
}
