/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '..';

export class FunctionsPage {
  public co2PerKWHField: Locator;
  public datacenterPUEField: Locator;
  public perCPUWattX86Field: Locator;
  public saveChangesButton: Locator;
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.co2PerKWHField = this.page.testSubj.locator(
      'management-settings-editField-profiling.co2PerKWH'
    );
    this.datacenterPUEField = this.page.testSubj.locator(
      'management-settings-editField-profiling.datacenterPUE'
    );
    this.perCPUWattX86Field = this.page.testSubj.locator(
      'management-settings-editField-profiling.perCPUWattX86'
    );
    this.saveChangesButton = this.page.testSubj.locator('management-settings-saveChangesButton');
  }

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('profiling')}/functions`);

    await this.waitForDifferentialTopNFunctionsTab();
  }

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string) {
    await this.page.goto(
      `${this.kbnUrl.app('profiling')}/functions?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`
    );
    await this.waitForDifferentialTopNFunctionsTab();
  }

  /*
   * Waits for the Differential TopN functions tab to be visible
   */
  private async waitForDifferentialTopNFunctionsTab() {
    await this.page
      .getByRole('tab', { name: 'Differential TopN functions' })
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  // TopN Functions methods
  async getTopNFunctionsTable() {
    return this.page.locator('[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]');
  }

  async getTopNFunctionsRow(rowIndex: number) {
    return this.page.locator(`[data-grid-row-index="${rowIndex}"]`);
  }

  async getTopNFunctionsCell(rowIndex: number, cellIndex: number) {
    return this.page.locator(
      `[data-grid-row-index="${rowIndex}"] [data-gridcell-column-index="${cellIndex}"]`
    );
  }

  async clickTopNFunctionsActionButton(rowIndex: number) {
    const firstRowSelector = `[data-grid-row-index="${rowIndex}"] [data-test-subj="dataGridRowCell"] .euiButtonIcon`;
    await this.page.locator(firstRowSelector).click();
  }

  // Frame Information Window methods
  async getFrameInformationWindow() {
    return this.page.testSubj.locator('frameInformationWindow');
  }

  async getFrameInformationRow(key: string) {
    return this.page.testSubj.locator(`informationRows_${key}`);
  }

  async getImpactEstimateRow(key: string) {
    return this.page.testSubj.locator(`impactEstimates_${key}`);
  }

  async clickFirstRowActionButton(firstRowSelector: string) {
    await this.page.locator(`${firstRowSelector} .euiButtonIcon`).click();
    await this.page.getByText('Frame information').waitFor({ state: 'visible' });
    await this.page.getByText('Impact estimates').waitFor({ state: 'visible' });
  }

  async getFrameInformationLocator(parentKey: string, key: string) {
    return this.page.testSubj.locator(`${parentKey}_${key}`);
  }

  // KQL Filter methods
  async addKqlFilter(key: string, value: string) {
    // Use the specific table search input
    await this.page.getByTestId('tableSearchInput').clear();
    await this.page.getByTestId('tableSearchInput').fill(`${key}:"${value}"`);
    await this.page.keyboard.press('Enter');
  }

  async clearKqlFilter() {
    await this.page.getByTestId('tableSearchInput').clear();
    await this.page.keyboard.press('Enter');
  }

  // Differential TopN Functions methods
  async getDifferentialTopNFunctionsTable() {
    return this.page.testSubj.locator('differentialTopnFunctionsTable');
  }

  async getDifferentialTopNFunctionsRow(rowIndex: number) {
    return this.page.testSubj.locator(`differentialDataGridRow-${rowIndex}`);
  }

  // Settings methods
  async clickSettingsButton() {
    await this.page
      .getByTestId('headerAppActionMenu')
      .getByRole('link', { name: 'Settings' })
      .click();
  }

  async getSettingsModal() {
    return this.page.testSubj.locator('profilingSettingsModal');
  }

  async updateCo2Settings(co2PerKWH: number, datacenterPUE: number, perCPUWatt: number) {
    await this.clickSettingsButton();

    // Update CO2 per KWH
    await this.co2PerKWHField.clear();
    await this.co2PerKWHField.fill(co2PerKWH.toString());

    // Update datacenter PUE
    await this.datacenterPUEField.clear();
    await this.datacenterPUEField.fill(datacenterPUE.toString());

    // Update per CPU watt
    await this.perCPUWattX86Field.clear();
    await this.perCPUWattX86Field.fill(perCPUWatt.toString());

    await this.saveChangesButton.click();
  }
}
