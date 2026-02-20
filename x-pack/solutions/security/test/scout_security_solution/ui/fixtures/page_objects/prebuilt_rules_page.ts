/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class PrebuiltRulesPage {
  readonly page: ScoutPage;
  readonly addElasticRulesTable: Locator;
  readonly installAllRulesButton: Locator;
  readonly installSelectedRulesButton: Locator;
  readonly ruleUpdatesTable: Locator;
  readonly upgradeAllRulesButton: Locator;
  readonly upgradeSelectedRulesButton: Locator;

  constructor(page: ScoutPage) {
    this.page = page;
    this.addElasticRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
    this.installAllRulesButton = page.testSubj.locator('installAllRulesButton');
    this.installSelectedRulesButton = page.testSubj.locator('installSelectedRulesButton');
    this.ruleUpdatesTable = page.testSubj.locator('rules-upgrades-table');
    this.upgradeAllRulesButton = page.testSubj.locator('upgradeAllRulesButton');
    this.upgradeSelectedRulesButton = page.testSubj.locator('upgradeSelectedRulesButton');
  }

  async gotoAddRules(): Promise<void> {
    await this.page.gotoApp('security/rules/add_rules');
  }

  async gotoRuleUpdates(): Promise<void> {
    await this.page.gotoApp('security/rules/updates');
  }

  async waitForAddRulesTable(): Promise<void> {
    await this.addElasticRulesTable.waitFor({ state: 'visible', timeout: 60000 });
  }

  async waitForUpgradesTable(): Promise<void> {
    await this.ruleUpdatesTable.waitFor({ state: 'visible', timeout: 60000 });
  }

  getInstallRuleButton(ruleId: string): Locator {
    return this.page.testSubj.locator('installSinglePrebuiltRuleButton-' + ruleId);
  }

  getUpgradeRuleButton(ruleId: string): Locator {
    return this.page.testSubj.locator('upgradeSinglePrebuiltRuleButton-' + ruleId);
  }
}
