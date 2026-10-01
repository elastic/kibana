/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

const LAST_7_DAYS_TEST_SUBJ = 'superDatePickerCommonlyUsed_Last_7 days';

/**
 * Response console overlay opened from an alert flyout. Actions only; the spec asserts.
 */
export class ResponseConsolePage {
  readonly overlay: Locator;
  readonly backLink: Locator;
  readonly actionLogButton: Locator;
  readonly actionLogFlyout: Locator;
  readonly actionLogDateQuickMenuButton: Locator;
  readonly actionLogDatesButton: Locator;
  readonly dateQuickMenu: Locator;
  private readonly last7DaysOption: Locator;

  constructor(private readonly page: ScoutPage) {
    this.overlay = page.testSubj.locator('consolePageOverlay');
    this.backLink = page.testSubj.locator('consolePageOverlay-header-back-link');
    this.actionLogButton = page.testSubj.locator('responderShowActionLogButton');
    this.actionLogFlyout = page.testSubj.locator('responderActionLogFlyout');
    this.actionLogDateQuickMenuButton = this.actionLogFlyout.getByTestId(
      'superDatePickerToggleQuickMenuButton'
    );
    this.actionLogDatesButton = this.actionLogFlyout.getByTestId('superDatePickerShowDatesButton');
    this.dateQuickMenu = page.testSubj.locator('superDatePickerQuickMenu');
    this.last7DaysOption = page.testSubj.locator(LAST_7_DAYS_TEST_SUBJ);
  }

  async openActionLog(): Promise<void> {
    await this.actionLogButton.click();
    await this.actionLogFlyout.waitFor({ state: 'visible' });
  }

  /** Opens the history date quick menu and chooses Last 7 days. */
  async selectActionLogLast7Days(): Promise<void> {
    await this.actionLogDateQuickMenuButton.click();
    await this.dateQuickMenu.waitFor({ state: 'visible' });
    await this.last7DaysOption.click();
    await this.dateQuickMenu.waitFor({ state: 'hidden' });
  }

  async closeActionLog(): Promise<void> {
    await this.actionLogFlyout.getByTestId('euiFlyoutCloseButton').click();
    await this.actionLogFlyout.waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.backLink.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }
}
