/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/** First wizard load waits for user-info / lists init and the ad-hoc data view. */
const APP_LOAD_TIMEOUT_MS = 60_000;

const ABOUT_STEP_NAME = 'scout-response-actions-create-rbac';

/**
 * Rule create / edit Actions step: Elastic Defend automated response-action
 * keypad and existing action rows.
 */
export class RuleResponseActionsFormPage {
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

  async completeWizardUntilActionsStep(): Promise<void> {
    // Open the wizard URL. The rules table swaps `create-new-rule` for
    // `create-rule-button` when AI rule creation is available.
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
    await queryInput.pressSequentially('_id:*');
    await this.page.keyboard.press('Enter');

    await this.defineContinue.click();
    // Hidden wizard steps stay in the DOM with display:none (kibana#248743).
    await this.aboutRuleName.waitFor({ state: 'visible' });
    await this.aboutRuleName.fill(ABOUT_STEP_NAME);
    await this.aboutRuleDescription.fill(ABOUT_STEP_NAME);
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
   * The keypad is either already visible, or hidden behind "Add response
   * action". `ResponseActionAddButton` only reads existing actions on first
   * paint, so edit can land in either state.
   */
  async ensureEndpointActionKeypad(): Promise<void> {
    await this.addResponseActionButton.or(this.endpointActionOption).waitFor({
      state: 'visible',
    });
    if (await this.endpointActionOption.isVisible()) {
      return;
    }
    await this.addResponseActionButton.click();
    await this.endpointActionOption.waitFor({ state: 'visible' });
  }
}
