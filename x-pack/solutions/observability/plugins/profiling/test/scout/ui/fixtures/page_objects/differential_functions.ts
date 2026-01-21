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
    await this.page.waitForLoadingIndicatorHidden();
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

  async getSummaryValue(id: string) {
    return this.page.testSubj.locator(`${id}_value`);
  }

  async getSummaryComparisonValue(id: string) {
    return this.page.testSubj.locator(`${id}_comparison_value`);
  }

  async addKqlFilterToBaseline(key: string, value: string) {
    const searchBar = this.page.testSubj.locator('profilingUnifiedSearchBar');
    await searchBar.fill(`${key}:"${value}"`);
    await searchBar.press('Enter');
    await this.page.waitForLoadingIndicatorHidden();
  }

  async addKqlFilterToComparison(key: string, value: string) {
    const searchBar = this.page.testSubj.locator('profilingComparisonUnifiedSearchBar');
    await searchBar.fill(`${key}:"${value}"`);
    await searchBar.press('Enter');
    await this.page.waitForLoadingIndicatorHidden();
  }
}
