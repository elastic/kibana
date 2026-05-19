/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export class UptimeSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(params?: Record<string, string>): Promise<void> {
    await this.page.gotoApp('uptime/settings', params ? { params } : undefined);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.waitForSelector('uptimeSettingsPage', { state: 'visible' });
  }

  async waitForDefaultConnectorsLoaded(): Promise<void> {
    await this.page.testSubj.locator('default-connectors-input-loaded').waitFor();
  }

  async clearDefaultConnectors(): Promise<void> {
    const clearConnectors = this.page.locator(
      '[data-test-subj="default-connectors-input-loaded"] >> [data-test-subj="comboBoxClearButton"]'
    );
    if (await clearConnectors.isVisible()) {
      await clearConnectors.click();
    }
  }

  async clearToEmailAddresses(): Promise<void> {
    const clearToEmail = this.page.locator(
      '[data-test-subj=toEmailAddressInput] >> [data-test-subj=comboBoxClearButton]'
    );
    if (await clearToEmail.isVisible()) {
      await clearToEmail.click();
    }
  }

  async fillToEmail(text: string): Promise<void> {
    await this.page.testSubj.locator('toEmailAddressInput').locator('input').fill(text);
    await this.page.testSubj.locator('toEmailAddressInput').locator('input').press('Enter');
  }

  async clickSaveSettings(): Promise<void> {
    await this.page.testSubj.click('apply-settings-button');
    await this.waitForLoadingToFinish();
  }

  getApplyButton() {
    return this.page.testSubj.locator('apply-settings-button');
  }

  async removeInvalidEmail(invalidEmail: string): Promise<void> {
    await this.page
      .locator(`[title="Remove ${invalidEmail} from selection in this group"]`)
      .click();
  }

  async createEmailConnector(config: {
    name: string;
    from: string;
    host: string;
    port: string;
  }): Promise<void> {
    await this.page.testSubj.click('createConnectorButton');
    await this.page.testSubj.locator('create-connector-flyout').waitFor({ state: 'visible' });
    await this.page.testSubj.locator('.email-card').click();
    await this.page.testSubj
      .locator('create-connector-flyout-save-btn')
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator('nameInput').fill(config.name);
    await this.page.testSubj.locator('emailFromInput').fill(config.from);
    await this.page.testSubj.locator('emailServiceSelectInput').selectOption('other');
    await this.page.testSubj.locator('emailHostInput').fill(config.host);
    await this.page.testSubj.locator('emailPortInput').fill(config.port);
    await this.page.testSubj.click('emailHasAuthSwitch');
    await this.page.testSubj.click('create-connector-flyout-save-btn');
    await this.page.testSubj.waitForSelector('nameInput', { state: 'hidden' });
  }

  async selectDefaultConnector(name: string): Promise<void> {
    await this.page.testSubj.click('default-connectors-input-loaded');
    await this.page.testSubj.click(`${name}`);
  }

  getDefaultConnectorsInput() {
    return this.page.testSubj.locator('default-connectors-input-loaded').locator('input');
  }

  getFormErrorText() {
    return this.page.locator('.euiFormErrorText');
  }
}
