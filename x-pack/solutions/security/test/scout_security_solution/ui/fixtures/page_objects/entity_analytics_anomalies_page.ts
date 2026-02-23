/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

/** Entity Analytics Anomalies dashboard table */
export class EntityAnalyticsAnomaliesPage {
  constructor(private readonly page: ScoutPage) {}

  public get anomaliesTable(): Locator {
    return this.page.testSubj
      .locator('entity_analytics_anomalies')
      .locator('#entityAnalyticsDashboardAnomaliesTable');
  }

  public get anomaliesTableRows(): Locator {
    return this.page.testSubj.locator('entity_analytics_anomalies').locator('.euiTableRow');
  }

  public get enableJobButton(): Locator {
    return this.page.testSubj.locator('enable-job');
  }

  public get enableJobLoader(): Locator {
    return this.page.testSubj.locator('job-switch-loader');
  }

  public get countColumn(): Locator {
    return this.page.testSubj.locator('anomalies-table-column-count');
  }

  public get nextPageButton(): Locator {
    return this.page.testSubj
      .locator('entity_analytics_anomalies')
      .locator('[data-test-subj="pagination-button-next"]');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics');
    await waitForPageReady(this.page);
  }

  async enableJobInRow(rowIndex: number): Promise<void> {
    const row = this.anomaliesTableRows.nth(rowIndex);
    await row.locator('[data-test-subj="enable-job"]').first().click();
  }

  async clickNextPage(): Promise<void> {
    await this.nextPageButton.first().click();
  }
}
