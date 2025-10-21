/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '@kbn/scout';

const PAGE_URL = 'security/alerts';

export class AlertsTablePage {
  public detectionsAlertsWrapper: Locator;
  public alertRow: Locator;
  public alertsTable: Locator;

  constructor(private readonly page: ScoutPage) {
    // Use the table container to check if alerts by rule section has loaded
    this.detectionsAlertsWrapper = this.page.testSubj.locator('alerts-by-rule-table');
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

  async waitForDetectionsAlertsWrapper(ruleName?: string) {
    // Wait for the alerts-by-rule table to be visible
    await this.detectionsAlertsWrapper.waitFor({ state: 'visible', timeout: 20_000 });

    // If a specific rule name is provided, wait for it to appear in the table
    if (ruleName) {
      await this.detectionsAlertsWrapper
        .getByText(ruleName)
        .waitFor({ state: 'visible', timeout: 20_000 });
    }
  }
}
