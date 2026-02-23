/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

export class RuleCreationPage {
  readonly defineStepContainer: Locator;
  readonly aboutStepContainer: Locator;
  readonly scheduleStepContainer: Locator;
  readonly createRuleButton: Locator;
  readonly queryInput: Locator;
  readonly ruleNameInput: Locator;
  readonly continueButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.defineStepContainer = this.page.testSubj.locator('defineRule');
    this.aboutStepContainer = this.page.testSubj.locator('aboutRule');
    this.scheduleStepContainer = this.page.testSubj.locator('scheduleRule');
    this.createRuleButton = this.page.testSubj.locator('createRuleButton');
    this.queryInput = this.page.testSubj.locator('queryInput');
    this.ruleNameInput = this.page.testSubj.locator('ruleNameInput');
    this.continueButton = this.page.testSubj.locator('continueButton');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('security/rules/create');
    await waitForPageReady(this.page);
  }

  async selectRuleType(ruleType: string): Promise<void> {
    const option = this.page.locator('[data-test-subj="ruleType"]').getByText(ruleType).first();
    await option.click();
  }

  async fillQuery(query: string): Promise<void> {
    const editor = this.page.testSubj.locator('kibanaCodeEditor');
    await editor.click();
    await editor.pressSequentially(query);
  }

  async fillRuleName(name: string): Promise<void> {
    await this.ruleNameInput.fill(name);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.first().click();
  }

  async createRule(): Promise<void> {
    await this.createRuleButton.first().click();
  }
}
