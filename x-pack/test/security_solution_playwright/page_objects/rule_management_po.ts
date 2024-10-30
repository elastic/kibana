/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Locator, Page } from '@playwright/test';

const PAGE_URL = '/app/security/rules/management';

const AUTO_REFRESH_POPOVER_TRIGGER_BUTTON = '[data-test-subj="autoRefreshButton"]';
const REFRESH_SETTINGS_SWITCH = '[data-test-subj="refreshSettingsSwitch"]';
const COLLAPSED_ACTION_BTN = '[data-test-subj="euiCollapsedItemActionsButton"]';
const MANUAL_RULE_RUN_ACTION_BTN = '[data-test-subj="manualRuleRunAction"]';
const MODAL_CONFIRMATION_BTN = '[data-test-subj="confirmModalConfirmButton"]';
const TOASTER = '[data-test-subj="euiToastHeader"]';

export class RuleManagementPage {
  page: Page;
  autoRefreshPopoverTriggerButton!: Locator;
  refreshSettingsSwitch!: Locator;
  collapsedActionBtn!: Locator;
  manualRuleRunActionBtn!: Locator;
  modalConfirmationBtn!: Locator;
  toaster!: Locator;

  constructor(page: Page) {
    this.page = page;
  }

  async initialize() {
    this.autoRefreshPopoverTriggerButton = this.page.locator(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON);
    this.refreshSettingsSwitch = this.page.locator(REFRESH_SETTINGS_SWITCH);
    this.collapsedActionBtn = this.page.locator(COLLAPSED_ACTION_BTN);
    this.manualRuleRunActionBtn = this.page.locator(MANUAL_RULE_RUN_ACTION_BTN);
    this.modalConfirmationBtn = this.page.locator(MODAL_CONFIRMATION_BTN);
    this.toaster = this.page.locator(TOASTER);
  }

  async navigate() {
    await this.page.goto(PAGE_URL);
  }

  async disableAutoRefresh() {
    await this.autoRefreshPopoverTriggerButton.click();
    await this.refreshSettingsSwitch.click();
  }

  async manuallyRunFirstRule() {
    await this.collapsedActionBtn.first().click();
    await expect(this.manualRuleRunActionBtn).toBeVisible();
    await this.manualRuleRunActionBtn.click();
    await this.modalConfirmationBtn.click();
  }
}
