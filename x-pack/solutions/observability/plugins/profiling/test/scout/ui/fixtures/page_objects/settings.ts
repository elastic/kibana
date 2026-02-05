/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '..';

export class ProfilingSettingsPage {
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('profiling')}/settings`);
    await this.page.getByTestId('profilingPageTemplate').waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  // Settings Form methods
  async getSettingsForm() {
    return this.page.testSubj.locator('profilingSettingsForm');
  }

  async getCo2PerKWHField() {
    return this.page.testSubj.locator('management-settings-editField-profiling.co2PerKWH');
  }

  async getDatacenterPUEField() {
    return this.page.testSubj.locator('management-settings-editField-profiling.datacenterPUE');
  }

  async getPerCPUWattX86Field() {
    return this.page.testSubj.locator('management-settings-editField-profiling.perCPUWattX86');
  }

  async updateCo2PerKWH(value: number) {
    const field = await this.getCo2PerKWHField();
    await field.clear();
    await field.fill(value.toString());
  }

  async updateDatacenterPUE(value: number) {
    const field = await this.getDatacenterPUEField();
    await field.clear();
    await field.fill(value.toString());
  }

  async updatePerCPUWattX86(value: number) {
    const field = await this.getPerCPUWattX86Field();
    await field.clear();
    await field.fill(value.toString());
  }

  // Save and Reset methods
  async saveSettings() {
    await this.page.getByText('Save changes').click();
  }

  async resetSettings() {
    await this.page.getByText('Reset to default').click();
  }

  async confirmReset() {
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  // Validation methods
  async getValidationError(fieldName: string) {
    return this.page.testSubj.locator(`profilingSettingsError-${fieldName}`);
  }

  async isSaveButtonEnabled() {
    const saveButton = this.page.getByText('Save changes');
    return await saveButton.isEnabled();
  }

  // Advanced Settings methods
  async gotoAdvancedSettings() {
    await this.page.getByText('Advanced Settings').click();
  }

  async getAdvancedSettingsSection() {
    return this.page.testSubj.locator('profilingAdvancedSettings');
  }

  // Data Collection methods
  async getDataCollectionSection() {
    return this.page.testSubj.locator('profilingDataCollection');
  }

  async enableDataCollection() {
    await this.page.testSubj.locator('profilingEnableDataCollection').click();
  }

  async disableDataCollection() {
    await this.page.testSubj.locator('profilingDisableDataCollection').click();
  }

  // Setup Status methods
  async getSetupStatus() {
    return this.page.testSubj.locator('profilingSetupStatus');
  }

  async getSetupStatusIndicator() {
    return this.page.testSubj.locator('profilingSetupStatusIndicator');
  }

  async isSetupComplete() {
    const status = await this.getSetupStatusIndicator();
    return (await status.getAttribute('data-status')) === 'complete';
  }

  // Help and Documentation methods
  async clickHelpButton() {
    await this.page.testSubj.locator('profilingSettingsHelp').click();
  }

  async getHelpModal() {
    return this.page.testSubj.locator('profilingSettingsHelpModal');
  }

  async closeHelpModal() {
    await this.page.testSubj.locator('profilingSettingsHelpModalClose').click();
  }
}
