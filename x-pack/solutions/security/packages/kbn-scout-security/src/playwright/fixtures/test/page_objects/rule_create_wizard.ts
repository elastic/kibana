/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** First wizard load waits for user-info / lists init and the ad-hoc data view. */
const APP_LOAD_TIMEOUT_MS = 60_000;

/**
 * Custom query rule create wizard: Define → About → Schedule → Actions.
 */
export class RuleCreateWizardPage {
  readonly defineStep: Locator;
  readonly defineContinue: Locator;
  readonly aboutRuleName: Locator;
  readonly aboutRuleDescription: Locator;
  readonly aboutContinue: Locator;
  readonly scheduleContinue: Locator;
  readonly createWithoutEnabling: Locator;

  constructor(private readonly page: ScoutPage) {
    this.defineStep = this.page.testSubj.locator('stepDefineRule');
    this.defineContinue = this.page.testSubj.locator('define-continue');
    this.aboutRuleName = this.page.testSubj
      .locator('detectionEngineStepAboutRuleName')
      .locator('[data-test-subj="input"]');
    this.aboutRuleDescription = this.page.testSubj
      .locator('detectionEngineStepAboutRuleDescription')
      .locator('[data-test-subj="input"]');
    this.aboutContinue = this.page.testSubj.locator('about-continue');
    this.scheduleContinue = this.page.testSubj.locator('schedule-continue');
    this.createWithoutEnabling = this.page.testSubj.locator('create-enabled-false');
  }

  /**
   * Opens `/security/rules/create` and walks Define → About → Schedule.
   * Hidden wizard steps stay in the DOM with `display:none` (kibana#248743).
   */
  async completeUntilActionsStep({
    name,
    description = name,
    query = '*:*',
  }: {
    name: string;
    description?: string;
    query?: string;
  }): Promise<void> {
    // The rules table swaps `create-new-rule` for `create-rule-button` when AI
    // rule creation is available, so open the wizard URL directly.
    await this.page.gotoApp('security/rules/create');
    await this.defineStep.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });

    const queryInput = this.page.testSubj
      .locator('defineRuleFormStepQueryEditor')
      .locator('[data-test-subj="queryInput"]')
      .filter({ visible: true });
    // Stays disabled while user-info / lists init and the ad-hoc data view create.
    await queryInput.and(this.page.locator(':enabled')).waitFor({
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT_MS,
    });
    await queryInput.click();
    // QueryStringInput ignores fill() — it syncs from React props.
    await queryInput.pressSequentially(query);
    await this.page.keyboard.press('Enter');

    await this.defineContinue.click();
    await this.aboutRuleName.waitFor({ state: 'visible' });
    await this.aboutRuleName.fill(name);
    await this.aboutRuleDescription.fill(description);
    await this.aboutContinue.click();

    await this.scheduleContinue.waitFor({ state: 'visible' });
    await this.scheduleContinue.click();

    await this.createWithoutEnabling.waitFor({ state: 'visible' });
  }
}
