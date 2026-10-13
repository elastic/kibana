/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { EXTENDED_TIMEOUT } from '..';

export class ProfilingSettingsPage {
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('profiling')}/settings`);
    await this.page
      .getByTestId(APP_HEADER_TEST_SUBJECTS.title)
      .getByText('Settings')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  async getPageTitle() {
    return this.page.getByTestId(APP_HEADER_TEST_SUBJECTS.title);
  }

  // Settings Form methods
  async getCo2PerKWHField() {
    return this.page.getByTestId('management-settings-editField-profiling.co2PerKWH');
  }

  async getDatacenterPUEField() {
    return this.page.getByTestId('management-settings-editField-profiling.datacenterPUE');
  }

  async getPerCPUWattX86Field() {
    return this.page.getByTestId('management-settings-editField-profiling.perCPUWattX86');
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
    await this.page.getByTestId('confirmModalConfirmButton').click();
  }

  // Validation methods
  async getValidationError(fieldName: string) {
    return this.page.getByTestId(`profilingSettingsError-${fieldName}`);
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
    return this.page.getByTestId('profilingAdvancedSettings');
  }

  // Data Collection methods
  async getDataCollectionSection() {
    return this.page.getByTestId('profilingDataCollection');
  }

  async enableDataCollection() {
    await this.page.getByTestId('profilingEnableDataCollection').click();
  }

  async disableDataCollection() {
    await this.page.getByTestId('profilingDisableDataCollection').click();
  }

  // Help and Documentation methods
  async clickHelpButton() {
    await this.page.getByTestId('profilingSettingsHelp').click();
  }

  async getHelpModal() {
    return this.page.getByTestId('profilingSettingsHelpModal');
  }

  async closeHelpModal() {
    await this.page.getByTestId('profilingSettingsHelpModalClose').click();
  }
}
