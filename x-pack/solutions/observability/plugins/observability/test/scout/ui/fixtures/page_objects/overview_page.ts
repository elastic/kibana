/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridWrapper, type Locator, type ScoutPage } from '@kbn/scout-oblt';
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
 * Time window a month before the generated alerts (mirrors `DATE_WITHOUT_DATA`).
 * Note the overview "no data" prompt is driven by whether any Observability
 * rules/indices exist, not by the selected range, so this is only used to mirror
 * the FTR navigation.
 */
const DATE_WITHOUT_DATA = {
  rangeFrom: '2021-09-18T13:36:22.109Z',
  rangeTo: '2021-09-20T13:36:22.109Z',
} as const;

/**
 * Drives the Observability overview page (`/app/observability/overview`).
 *
 * Ported from the FTR `observability.overview.common` service
 * (x-pack/solutions/observability/test/functional/services/observability/overview/common.ts).
 * Page objects only drive the UI and return state; assertions live in the specs.
 */
export class OverviewPage {
  public readonly noDataPrompt: Locator;
  public readonly addDataButton: Locator;
  public readonly alertsSection: Locator;
  public readonly alertsTable: Locator;
  public readonly alertsDataGrid: EuiDataGridWrapper;

  constructor(private readonly page: ScoutPage) {
    this.noDataPrompt = this.page.testSubj.locator('obltOverviewNoDataPrompt');
    this.addDataButton = this.page.testSubj.locator('o11yOverviewPageAddDataButton');
    this.alertsSection = this.page.testSubj.locator('accordion-Alerts');
    this.alertsTable = this.page.testSubj.locator(SUBJ.TABLE_LOADED);
    this.alertsDataGrid = new EuiDataGridWrapper(this.page, SUBJ.TABLE_LOADED);
  }

  /** Navigates to the overview using the time window that contains alerts. */
  async gotoWithAlerts() {
    await this.page.gotoApp('observability/overview', { params: { ...DATE_WITH_DATA } });
  }

  /** Navigates to the overview using a time window before any alerts exist. */
  async gotoWithoutAlerts() {
    await this.page.gotoApp('observability/overview', { params: { ...DATE_WITHOUT_DATA } });
  }

  /** Waits for the alerts accordion (open by default) to render its table. */
  async waitForAlertsSection() {
    await this.alertsSection.waitFor({ state: 'visible' });
    await this.alertsTable.scrollIntoViewIfNeeded();
    await this.alertsTable.waitFor({ state: 'visible' });
  }

  /** Returns the number of alert rows rendered in the overview alerts table. */
  async getAlertsRowCount(): Promise<number> {
    return this.alertsDataGrid.getRowsCount();
  }

  /** Clicks the empty-state "Add data" CTA that links to onboarding. */
  async clickAddData() {
    await this.addDataButton.click();
  }
}
