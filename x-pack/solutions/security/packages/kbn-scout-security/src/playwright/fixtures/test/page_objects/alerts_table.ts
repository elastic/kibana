/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator, expect } from '@kbn/scout';

const PAGE_URL = 'security/alerts';

export class AlertsTablePage {
  public detectionsAlertsWrapper: Locator;
  public alertRow: Locator;
  public alertsTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.detectionsAlertsWrapper = this.page.testSubj.locator('detectionsAlertsPage');
    this.alertRow = this.page.locator('div.euiDataGridRow');
    this.alertsTable = this.page.testSubj.locator('alertsTableIsLoaded'); // Search for loaded Alerts table
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandAlertDetailsFlyout(ruleName: string) {
    await this.alertsTable.waitFor({ state: 'visible' });
    // Filter alert by unique rule name
    const row = this.alertRow.filter({ hasText: ruleName });
    await expect(
      row,
      `Alert with rule '${ruleName}' is not displayed in the alerts table`
    ).toBeVisible();

    return row.locator(`[data-test-subj='expand-event']`).click();
  }

  async waitForDetectionsAlertsWrapper() {
    // Increased timeout to 20 seconds because this page sometimes takes longer to load
    return this.detectionsAlertsWrapper.waitFor({ state: 'visible', timeout: 20_000 });
  }
}
