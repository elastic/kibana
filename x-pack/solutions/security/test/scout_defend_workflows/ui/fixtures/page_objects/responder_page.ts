/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ResponderPage {
  readonly overlay: Locator;
  readonly backLink: Locator;
  readonly actionLogButton: Locator;
  readonly actionLogFlyout: Locator;
  readonly commandInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.overlay = this.page.testSubj.locator('consolePageOverlay');
    this.backLink = this.page.testSubj.locator('consolePageOverlay-header-back-link');
    this.actionLogButton = this.page.testSubj.locator('responderShowActionLogButton');
    this.actionLogFlyout = this.page.testSubj.locator('responderActionLogFlyout');
    this.commandInput = this.page.testSubj.locator('consoleCli-inputTextArea');
  }

  async waitForResponderOpen() {
    await this.overlay.waitFor({ state: 'visible' });
  }

  async close() {
    await this.backLink.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }

  async openActionLog() {
    await this.actionLogButton.click();
    await this.actionLogFlyout.waitFor({ state: 'visible' });
  }

  async closeActionLog() {
    if (await this.actionLogFlyout.isVisible()) {
      await this.actionLogFlyout.locator('[data-test-subj="euiFlyoutCloseButton"]').click();
      await this.actionLogFlyout.waitFor({ state: 'hidden' });
    }
  }

  async executeCommand(command: string) {
    await this.commandInput.fill(command);
    await this.page.keyboard.press('Enter');
  }
}
