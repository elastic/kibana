/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Detection-rule wizard / edit Actions tab — Elastic Defend response-action keypad.
 */
export class RuleResponseActionsForm {
  public readonly createNewRuleButton: Locator;
  public readonly defineStep: Locator;
  public readonly defineContinue: Locator;
  public readonly aboutName: Locator;
  public readonly aboutDescription: Locator;
  public readonly aboutContinue: Locator;
  public readonly scheduleContinue: Locator;
  public readonly editActionsTab: Locator;
  public readonly responseActionsWrapper: Locator;
  public readonly elasticDefendOption: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createNewRuleButton = this.page.testSubj.locator('create-new-rule');
    this.defineStep = this.page.testSubj.locator('stepDefineRule');
    this.defineContinue = this.page.testSubj.locator('define-continue');
    this.aboutName = this.page.testSubj.locator('detectionEngineStepAboutRuleName');
    this.aboutDescription = this.page.testSubj.locator('detectionEngineStepAboutRuleDescription');
    this.aboutContinue = this.page.testSubj.locator('about-continue');
    this.scheduleContinue = this.page.testSubj.locator('schedule-continue');
    this.editActionsTab = this.page.testSubj.locator('edit-rule-actions-tab');
    this.responseActionsWrapper = this.page.testSubj.locator('response-actions-wrapper');
    this.elasticDefendOption = this.responseActionsWrapper.getByTestId(
      'Elastic Defend-response-action-type-selection-option'
    );
  }

  private async dismissProjectPickerTour(): Promise<void> {
    await this.page.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
  }

  responseActionItem(index: number): Locator {
    return this.page.testSubj.locator(`response-actions-list-item-${index}`);
  }

  commandField(index: number): Locator {
    return this.responseActionItem(index).getByTestId('commandTypeField');
  }

  commentInput(index: number): Locator {
    return this.responseActionItem(index).getByTestId('input');
  }

  removeButton(index: number): Locator {
    return this.responseActionItem(index).getByTestId('remove-response-action');
  }

  async fillNewCustomQueryRule(params: { name: string; description: string }): Promise<void> {
    await this.dismissProjectPickerTour();
    await this.page.gotoApp('security/rules/management');
    await this.createNewRuleButton.waitFor({ state: 'visible' });
    await this.createNewRuleButton.click();

    await this.defineStep.waitFor({ state: 'visible' });
    const queryInput = this.defineStep.getByTestId('queryInput');
    await queryInput.waitFor({ state: 'visible' });
    await queryInput.pressSequentially('_id:*');
    await this.page.keyboard.press('Enter');
    await this.defineContinue.click();

    await this.aboutName.waitFor({ state: 'visible' });
    await this.aboutName.getByTestId('input').pressSequentially(params.name);
    await this.aboutDescription.getByTestId('input').pressSequentially(params.description);
    await this.aboutContinue.click();
    await this.scheduleContinue.waitFor({ state: 'visible' });
    await this.scheduleContinue.click();
    await this.responseActionsWrapper.waitFor({ state: 'visible' });
  }

  async openEditActions(ruleId: string): Promise<void> {
    await this.dismissProjectPickerTour();
    await this.page.gotoApp(`security/rules/id/${ruleId}/edit`);
    await this.editActionsTab.waitFor({ state: 'visible' });
    await this.editActionsTab.click();
    await this.responseActionsWrapper.waitFor({ state: 'visible' });
  }

  /**
   * The keypad is disabled for rule_author. dispatchEvent is required to prove a
   * forced click still does not add a row (Playwright will not click a disabled control).
   */
  async forceClickElasticDefendOption(): Promise<void> {
    await this.elasticDefendOption.dispatchEvent('click');
  }

  /**
   * Remove is disabled for rule_author. dispatchEvent is required to prove a
   * forced click still does not drop an existing row.
   */
  async forceRemove(index: number): Promise<void> {
    await this.removeButton(index).dispatchEvent('click');
  }
}
