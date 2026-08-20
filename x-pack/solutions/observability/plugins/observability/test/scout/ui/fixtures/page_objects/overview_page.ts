/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridObject, Locator, ScoutPage } from '@kbn/scout-oblt';
import { ALERTS_TABLE_TEST_SUBJECTS as SUBJ } from '../constants';

/**
 * Time window that contains the generated Observability alerts (mirrors
 * `DATE_WITH_DATA` from the FTR overview common service).
 */
const DATE_WITH_DATA = {
  rangeFrom: '2021-10-18T13:36:22.109Z',
  rangeTo: '2021-10-20T13:36:22.109Z',
} as const;

/**
 * Drives the Observability overview page (`/app/observability/overview`).
 *
 * Ported from the FTR `observability.overview.common` service
 * (x-pack/solutions/observability/test/functional/services/observability/overview/common.ts).
 * Page objects only drive the UI and return state; assertions live in the specs.
 */
export class OverviewPage {
  public readonly alertsSection: Locator;
  public readonly alertsTable: Locator;
  public readonly alertsDataGrid: EuiDataGridObject;

  constructor(private readonly page: ScoutPage) {
    this.alertsSection = this.page.testSubj.locator('accordion-Alerts');
    this.alertsTable = this.page.testSubj.locator(SUBJ.TABLE_LOADED);
    this.alertsDataGrid = this.page.components.dataGrid(SUBJ.TABLE_LOADED);
  }

  /** Navigates to the overview using the time window that contains alerts. */
  async gotoWithAlerts() {
    await this.page.gotoApp('observability/overview', { params: { ...DATE_WITH_DATA } });
  }

  /** Waits for the alerts accordion (open by default) to render its table. */
  async waitForAlertsSection() {
    await this.alertsSection.waitFor({ state: 'visible' });
    await this.alertsTable.scrollIntoViewIfNeeded();
    await this.alertsTable.waitFor({ state: 'visible' });
  }

  /** Returns the number of alert rows rendered in the overview alerts table. */
  async getAlertsRowCount(): Promise<number> {
    return this.alertsDataGrid.rows.count();
  }
}
