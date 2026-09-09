/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/** First load of the rule wizard compiles the app bundle in dev. */
const APP_LOAD_TIMEOUT_MS = 60_000;

/**
 * Rule create / edit Actions step: Elastic Defend automated response-action
 * keypad and existing action rows.
 */
export class RuleResponseActionsFormPage {
  readonly createNewRuleButton: Locator;
  readonly defineStep: Locator;
  readonly defineContinue: Locator;
  readonly aboutRuleName: Locator;
  readonly aboutRuleDescription: Locator;
  readonly aboutContinue: Locator;
  readonly scheduleContinue: Locator;
  readonly editActionsTab: Locator;
  readonly responseActionsWrapper: Locator;
  readonly addResponseActionButton: Locator;
  readonly endpointActionOption: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createNewRuleButton = this.page.testSubj.locator('create-new-rule');
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
    this.editActionsTab = this.page.testSubj.locator('edit-rule-actions-tab');
    this.responseActionsWrapper = this.page.testSubj.locator('response-actions-wrapper');
    this.addResponseActionButton = this.page.testSubj.locator('addAlertActionButton');
    this.endpointActionOption = this.page.testSubj.locator(
      'Elastic Defend-response-action-type-selection-option'
    );
  }

  responseActionItem(index: number): Locator {
    return this.page.testSubj.locator(`response-actions-list-item-${index}`);
  }

  commandTypeField(index: number): Locator {
    return this.responseActionItem(index).locator('[data-test-subj="commandTypeField"]');
  }

  commentInput(index: number): Locator {
    return this.responseActionItem(index).locator('[data-test-subj="input"]');
  }

  removeResponseAction(index: number): Locator {
    return this.responseActionItem(index).locator('[data-test-subj="remove-response-action"]');
  }

  async gotoRuleManagement(): Promise<void> {
    await this.page.gotoApp('security/rules/management');
    await this.createNewRuleButton.waitFor({
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT_MS,
    });
  }

  async gotoCreateActionsStep(name: string, description: string): Promise<void> {
    await this.gotoRuleManagement();
    await this.createNewRuleButton.click();
    await this.defineStep.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });

    const queryInput = this.page.testSubj
      .locator('defineRuleFormStepQueryEditor')
      .locator('[data-test-subj="queryInput"]')
      .filter({ visible: true });
    await queryInput.click();
    // QueryStringInput ignores fill() — it syncs from React props.
    await queryInput.pressSequentially('_id:*');
    await this.page.keyboard.press('Enter');

    await this.defineContinue.click();
    // Hidden wizard steps stay in the DOM with display:none (kibana#248743).
    await this.aboutRuleName.waitFor({ state: 'visible' });
    await this.aboutRuleName.fill(name);
    await this.aboutRuleDescription.fill(description);
    await this.aboutContinue.click();

    await this.scheduleContinue.waitFor({ state: 'visible' });
    await this.scheduleContinue.click();

    await this.responseActionsWrapper.waitFor({ state: 'visible' });
  }

  async gotoEditActions(ruleId: string): Promise<void> {
    await this.page.gotoApp(`security/rules/id/${ruleId}/edit`);
    await this.editActionsTab.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
    await this.editActionsTab.click();
    await this.responseActionsWrapper.waitFor({ state: 'visible' });
    await this.responseActionItem(0).waitFor({ state: 'visible' });
  }

  /**
   * The keypad is hidden behind "Add response action" when the form already
   * has items. Revealing it does not add a row.
   */
  async revealEndpointActionKeypad(): Promise<void> {
    if (await this.addResponseActionButton.isVisible()) {
      await this.addResponseActionButton.click();
    }
    await this.endpointActionOption.waitFor({ state: 'visible' });
  }

  /**
   * Clicks the disabled Elastic Defend keypad item without Playwright
   * actionability checks. The control is intentionally disabled for
   * `rule_author`; the assertion is that no new row appears.
   */
  async dispatchClickOnDisabledEndpointOption(): Promise<void> {
    await this.endpointActionOption.dispatchEvent('click');
  }

  /**
   * Clicks a disabled remove control. Same RBAC contract as the Cypress
   * `{ force: true }` click: the row must stay.
   */
  async dispatchClickOnDisabledRemove(index: number): Promise<void> {
    await this.removeResponseAction(index).dispatchEvent('click');
  }
}
