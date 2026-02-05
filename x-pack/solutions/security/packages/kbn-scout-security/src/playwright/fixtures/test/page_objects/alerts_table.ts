/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '../../../../../ui';

const PAGE_URL = 'security/alerts';

export class AlertsTablePage {
  public detectionsAlertsWrapper: Locator;
  public alertRow: Locator;
  public alertsTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.detectionsAlertsWrapper = this.page.testSubj.locator('alerts-by-rule-table');
    this.alertsTable = this.page.testSubj.locator('alertsTableIsLoaded'); // Search for loaded Alerts table
    this.alertRow = this.page.testSubj.locator('alertsTableIsLoaded').locator('div.euiDataGridRow');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandAlertDetailsFlyout(ruleName: string) {
    await this.alertsTable.waitFor({ state: 'visible' });
    // 1. Find the rule name cell (unique per alert)
    const ruleNameCell = this.alertsTable.getByTestId('ruleName').filter({ hasText: ruleName });

    await expect(
      ruleNameCell,
      `Alert with rule '${ruleName}' is not displayed in the alerts table`
    ).toHaveCount(1);

    // 2. Climb up to the DataGrid row
    const row = ruleNameCell.locator('xpath=ancestor::div[contains(@class,"euiDataGridRow")]');

    // 3. Click expand button in the row
    await row.getByTestId('expand-event').click();
  }

  async waitForDetectionsAlertsWrapper() {
    // Increased timeout to 20 seconds because this page sometimes takes longer to load
    return this.detectionsAlertsWrapper.waitFor({ state: 'visible', timeout: 20_000 });
  }
}
