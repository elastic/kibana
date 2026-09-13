/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/** First load of the rule edit page compiles the app bundle in dev. */
const APP_LOAD_TIMEOUT_MS = 60_000;

/**
 * Rule create / edit Actions step: Elastic Defend automated response-action
 * keypad and existing action rows.
 */
export class RuleResponseActionsFormPage {
  readonly editActionsTab: Locator;
  readonly responseActionsWrapper: Locator;
  readonly addResponseActionButton: Locator;
  readonly endpointActionOption: Locator;

  constructor(private readonly page: ScoutPage) {
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
