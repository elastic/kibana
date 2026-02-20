/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class RuleEditPage {
  readonly ruleNameHeader: Locator; // header-page-title
  readonly editRuleButton: Locator;
  readonly saveChangesButton: Locator;
  readonly backToRulesButton: Locator;
  readonly ruleDetailsTabs: Locator;

  constructor(private readonly page: ScoutPage) {
    this.ruleNameHeader = this.page.testSubj.locator('header-page-title');
    this.editRuleButton = this.page.testSubj.locator('editRuleButton');
    this.saveChangesButton = this.page.testSubj.locator('saveChangesButton');
    this.backToRulesButton = this.page.testSubj.locator('backToRulesButton');
    this.ruleDetailsTabs = this.page.testSubj.locator('ruleDetailsTab');
  }

  async gotoRuleDetails(ruleId: string, tab?: string): Promise<void> {
    const path = tab ? `security/rules/id/${ruleId}?tab=${tab}` : `security/rules/id/${ruleId}`;
    await this.page.gotoApp(path);
  }

  async goToAlertsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: /alerts/i }).first().click();
  }

  async goToExceptionsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: /exceptions/i }).first().click();
  }

  async goToClosedAlerts(): Promise<void> {
    await this.page.testSubj.locator('closedAlerts').first().click();
  }

  async goToOpenedAlerts(): Promise<void> {
    await this.page.testSubj.locator('openAlerts').first().click();
  }
}
