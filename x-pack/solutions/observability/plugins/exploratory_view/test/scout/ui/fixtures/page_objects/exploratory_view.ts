/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout-oblt';

export class ExploratoryViewPage {
  public readonly echLegendItemLocator;

  constructor(private readonly page: ScoutPage) {
    this.echLegendItemLocator = this.page.locator('[data-testid="echLegendItemLabel"]');
  }

  /** `createExploratoryViewUrl` keeps the whole series config in the hash, so only that is forwarded. */
  async goto(urlPath: string): Promise<void> {
    const [, hash = ''] = urlPath.split('#');
    await this.page.gotoApp('exploratory-view', {
      hash,
      readyWhen: this.page.testSubj.locator('exploratoryViewMainContainer'),
    });
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.locator('exploratoryViewMainContainer').waitFor();
  }

  async changeReportMetric(value: string): Promise<void> {
    await this.page.click('[aria-label="Remove report metric"]');
    await this.page.testSubj.click('o11yReportMetricOptionsButton');
    await this.page.click(`button:has-text("${value}")`);
  }

  async selectSeriesBreakdown(value: string): Promise<void> {
    await this.page.testSubj.locator('seriesBreakdown').click();
    await this.page.click(`button[role="option"]:has-text("${value}")`);
  }

  /**
   * Expands the inline editor for a series so its breakdown / metric controls
   * become available. Series rendered from a prefilled URL (e.g. opened from the
   * UX app's "Explore data" link) start collapsed.
   */
  async editSeries(seriesId: number = 0): Promise<void> {
    await this.page.testSubj.click(`editSeries${seriesId}`);
  }

  /**
   * Selects a breakdown by its underlying field name (the EuiSuperSelect option's
   * `id` is the field, while the visible label is a human-readable name), e.g.
   * `user_agent.name`. Mirrors the FTR's `[id="user_agent.name"]` selector.
   */
  async selectSeriesBreakdownByField(fieldId: string): Promise<void> {
    await this.page.testSubj.locator('seriesBreakdown').click();
    await this.page.locator(`[id="${fieldId}"]`).click();
  }

  async applySeriesChanges(): Promise<void> {
    await this.page.testSubj.click('seriesChangesApplyButton');
  }
}
