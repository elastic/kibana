/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

export type RuleDetailsTab =
  | 'alerts'
  | 'rule_exceptions'
  | 'endpoint_exceptions'
  | 'execution_results'
  | 'execution_events';

export class RuleDetailsPage {
  readonly page: ScoutPage;
  readonly ruleNameHeader: Locator;
  readonly ruleSwitch: Locator;
  readonly alertsTab: Locator;
  readonly exceptionsTab: Locator;
  readonly executionsTab: Locator;
  readonly popoverActionsTrigger: Locator;
  readonly exportRuleAction: Locator;
  readonly deleteRuleAction: Locator;
  readonly definitionDetails: Locator;
  readonly aboutDetails: Locator;

  constructor(page: ScoutPage) {
    this.page = page;
    this.ruleNameHeader = page.testSubj.locator('header-page-title');
    this.ruleSwitch = page.testSubj.locator('ruleSwitch');
    this.alertsTab = page.testSubj.locator('navigation-alerts');
    this.exceptionsTab = page.locator('a[data-test-subj="navigation-rule_exceptions"]');
    this.executionsTab = page.testSubj.locator('navigation-execution_results');
    this.popoverActionsTrigger = page.testSubj.locator('rules-details-popover-button-icon');
    this.exportRuleAction = page.testSubj.locator('rules-details-export-rule');
    this.deleteRuleAction = page.testSubj.locator('rules-details-delete-rule');
    this.definitionDetails = page.testSubj.locator('definitionRule');
    this.aboutDetails = page.testSubj.locator('aboutRule');
  }

  async goto(ruleId: string, tab?: RuleDetailsTab): Promise<void> {
    const path = tab ? `security/rules/id/${ruleId}/${tab}` : `security/rules/id/${ruleId}`;
    await this.page.gotoApp(path as 'security/rules/id');
    await waitForPageReady(this.page);
  }

  async waitForPageToLoad(ruleName: string): Promise<void> {
    const spinner = this.page.testSubj.locator('pageContentSpinner');
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.ruleNameHeader
      .filter({ hasText: ruleName })
      .waitFor({ state: 'visible', timeout: 30000 });
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }

  async goToAlertsTab(): Promise<void> {
    await this.alertsTab.click();
  }

  async goToExceptionsTab(): Promise<void> {
    await this.exceptionsTab.click();
  }

  async goToExecutionLogTab(): Promise<void> {
    await this.executionsTab.click();
  }

  async exportRule(): Promise<void> {
    await this.popoverActionsTrigger.click();
    await this.exportRuleAction.click();
  }

  async deleteRule(): Promise<void> {
    await this.popoverActionsTrigger.click();
    await this.deleteRuleAction.click();
    await this.page.testSubj.locator('confirmModalConfirmButton').first().click();
  }

  async clickEnableRuleSwitch(): Promise<void> {
    await this.ruleSwitch.click();
  }
}
