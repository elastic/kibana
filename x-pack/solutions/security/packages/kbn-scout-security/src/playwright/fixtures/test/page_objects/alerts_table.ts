/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/alerts';

export class AlertsTablePage {
  public expandAlertBtn: Locator;
  public alertsTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.expandAlertBtn = this.page.testSubj.locator('expand-event');
    this.alertsTable = this.page.testSubj.locator('alertsTable');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandFirstAlertDetailsFlyout() {
    await this.page.waitForLoadingIndicatorHidden();
    await this.alertsTable.waitFor({ state: 'visible' });

    const alertRows = await this.page.$$(`div.euiDataGridRow [data-test-subj='expand-event']`);

    if (alertRows.length === 0) {
      throw new Error('No alerts found in the table');
    }

    await alertRows[0].click();
  }

  async getCurrentUrl() {
    const url = this.page.url();
    return url;
  }

  async reload() {
    return this.page.reload();
  }
}
