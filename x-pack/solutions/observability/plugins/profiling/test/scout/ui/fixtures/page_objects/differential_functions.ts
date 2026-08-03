/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '..';

export class DifferentialFunctionsPage {
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoDifferential() {
    await this.page.goto(`${this.kbnUrl.app('profiling')}/functions/differential`);
    await this.page.testSubj
      .locator('profilingNormalizationMenuButton')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  async gotoDifferentialWithTimeRange(
    rangeFrom?: string,
    rangeTo?: string,
    comparisonRangeFrom?: string,
    comparisonRangeTo?: string
  ) {
    const params = new URLSearchParams();
    if (rangeFrom && rangeTo) {
      params.append('rangeFrom', rangeFrom);
      params.append('rangeTo', rangeTo);
    }
    if (comparisonRangeFrom && comparisonRangeTo) {
      params.append('comparisonRangeFrom', comparisonRangeFrom);
      params.append('comparisonRangeTo', comparisonRangeTo);
    }
    await this.page.goto(
      `${this.kbnUrl.app('profiling')}/functions/differential?${params.toString()}`
    );

    await this.page.testSubj
      .locator('overallPerformance_value')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  getSummaryValue(id: string) {
    return this.page.testSubj.locator(`${id}_value`);
  }

  getSummaryComparisonValue(id: string) {
    return this.page.testSubj.locator(`${id}_comparison_value`);
  }

  async addKqlFilterToBaseline(key: string, value: string) {
    await this.applyKqlFilter('profilingUnifiedSearchBar', key, value);
  }

  async addKqlFilterToComparison(key: string, value: string) {
    await this.applyKqlFilter('profilingComparisonUnifiedSearchBar', key, value);
  }

  private async applyKqlFilter(searchBarTestSubj: string, key: string, value: string) {
    const searchBar = this.page.testSubj.locator(searchBarTestSubj);
    await searchBar.fill(`${key}:"${value}"`);
    await searchBar.press('Enter');
    await this.waitForGridRefresh();
  }

  private async waitForGridRefresh() {
    const grid = this.page.testSubj.locator('profilingDiffTopNFunctionsGrid');
    await grid.waitFor({ state: 'hidden' });
    await grid.waitFor({ state: 'visible' });
  }
}
