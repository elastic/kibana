/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Locator, Page } from '@playwright/test';

const PAGE_URL = '/app/security/rules/id/';

const POPOVER_ACTIONS_TRIGGER_BUTTON = '[data-test-subj="rules-details-popover-button-icon"]';
const RULE_DETAILS_MANUAL_RULE_RUN_BTN = '[data-test-subj="rules-details-manual-rule-run"]';
const MODAL_CONFIRMATION_BTN = '[data-test-subj="confirmModalConfirmButton"]';
const TOASTER = '[data-test-subj="euiToastHeader"]';

export class RuleDetailsPage {
  page: Page;
  popoverActionsTriggerButton!: Locator;
  ruleDetailsManualRuleRunButton!: Locator;
  modalConfirmationBtn!: Locator;
  toaster!: Locator;

  constructor(page: Page) {
    this.page = page;
  }

  async initialize() {
    this.popoverActionsTriggerButton = this.page.locator(POPOVER_ACTIONS_TRIGGER_BUTTON);
    this.ruleDetailsManualRuleRunButton = this.page.locator(RULE_DETAILS_MANUAL_RULE_RUN_BTN);
    this.modalConfirmationBtn = this.page.locator(MODAL_CONFIRMATION_BTN);
    this.toaster = this.page.locator(TOASTER);
  }

  async navigateTo(ruleId: string) {
    await this.page.goto(`${PAGE_URL}${ruleId}`);
  }

  async manualRuleRun() {
    await this.popoverActionsTriggerButton.click();
    await this.ruleDetailsManualRuleRunButton.click();
    await this.modalConfirmationBtn.click();
  }
}
