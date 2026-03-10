/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '..';

export class ProfilingStorageExplorerPage {
  public pageTitle: Locator;
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.pageTitle = this.page.getByRole('heading', {
      name: 'Storage explorer',
      level: 1,
      exact: true,
    });
  }

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('profiling')}/storage-explorer`);
    await this.waitForStorageExplorerPage();
  }

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string, kuery?: string) {
    let url = `${this.kbnUrl.app(
      'profiling'
    )}/storage-explorer?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`;
    if (kuery) {
      url += `&kuery=${encodeURIComponent(kuery)}`;
    }
    await this.page.goto(url);

    await this.waitForStorageExplorerPage();
  }

  /*
   * Waits for the Storage explorer page to be visible
   */
  private async waitForStorageExplorerPage() {
    await this.page
      .getByTestId('profilingPageTemplate')
      .getByText('Storage explorer')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  // Summary Stats methods
  async getSummaryStats() {
    return this.page.testSubj.locator('profilingStorageExplorerSummaryStats');
  }

  async getSummaryStatItem(statName: string) {
    return this.page.testSubj.locator(`profilingSummaryStat-${statName}`);
  }

  // Storage Chart methods
  async getStorageChart() {
    return this.page.testSubj.locator('profilingStorageChart');
  }

  async getStorageChartCanvas() {
    return this.page.testSubj.locator('profilingStorageChartCanvas');
  }

  // Storage Table methods
  async getStorageTable() {
    return this.page.testSubj.locator('profilingStorageTable');
  }

  async getStorageTableRow(rowIndex: number) {
    return this.page.testSubj.locator(`profilingStorageTableRow-${rowIndex}`);
  }

  async getStorageTableCell(rowIndex: number, cellIndex: number) {
    return this.page.testSubj.locator(`profilingStorageTableCell-${rowIndex}-${cellIndex}`);
  }

  async clickStorageTableRow(rowIndex: number) {
    const row = await this.getStorageTableRow(rowIndex);
    await row.click();
  }

  // Filter methods
  async addStorageFilter(key: string, value: string) {
    const filterInput = this.page.testSubj.locator('profilingStorageFilter');
    await filterInput.fill(`${key}: "${value}"`);
    await this.page.keyboard.press('Enter');
  }

  async clearStorageFilter() {
    const filterInput = this.page.testSubj.locator('profilingStorageFilter');
    await filterInput.clear();
    await this.page.keyboard.press('Enter');
  }

  // Time Range methods
  async selectTimeRange(rangeFrom: string, rangeTo: string) {
    await this.page.testSubj.locator('profilingTimeRangePicker').click();
    await this.page.testSubj.locator('profilingTimeRangeFrom').fill(rangeFrom);
    await this.page.testSubj.locator('profilingTimeRangeTo').fill(rangeTo);
    await this.page.testSubj.locator('profilingTimeRangeApply').click();
  }

  // Refresh methods
  async refreshData() {
    await this.page.testSubj.locator('profilingRefreshButton').click();
  }

  // Export methods
  async exportData(format: 'csv' | 'json') {
    await this.page.testSubj.locator('profilingExportButton').click();
    await this.page.getByText(format).click();
  }

  // Loading indicator methods
  async waitForDataLoad() {
    await this.page.testSubj.locator('profilingLoadingIndicator').waitFor({ state: 'hidden' });
  }

  async isDataLoading() {
    return await this.page.testSubj.locator('profilingLoadingIndicator').isVisible();
  }
}
