/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const ALERTS_APP_PATH = 'security/alerts';

/**
 * Alerts page entry into the flyout v2 Response details for one alert.
 */
export class AlertFlyoutResponsePage {
  readonly alertsTable: Locator;
  readonly expandEvent: Locator;
  readonly flyoutTitle: Locator;
  readonly responseSection: Locator;
  readonly responseSectionHeader: Locator;
  readonly responseButton: Locator;
  readonly responseDetails: Locator;
  readonly tableSection: Locator;
  readonly refreshQuery: Locator;

  constructor(private readonly page: ScoutPage) {
    this.tableSection = this.page.testSubj.locator('alerts-page-table-section');
    this.refreshQuery = this.page.testSubj
      .locator('alerts-page-content')
      .getByTestId('querySubmitButton');
    this.alertsTable = this.page.testSubj.locator('alertsTableIsLoaded');
    this.expandEvent = this.alertsTable.getByTestId('expand-event');
    this.flyoutTitle = this.page.testSubj.locator('securitySolutionFlyoutAlertTitleText');
    this.responseSection = this.page.testSubj.locator('securitySolutionFlyoutResponseSection');
    this.responseSectionHeader = this.page.testSubj.locator(
      'securitySolutionFlyoutResponseSectionHeader'
    );
    this.responseButton = this.page.testSubj.locator('securitySolutionFlyoutResponseButton');
    this.responseDetails = this.page.testSubj.locator('securitySolutionFlyoutResponseDetails');
  }

  async openAlert(alertId: string): Promise<void> {
    await this.page.gotoApp(ALERTS_APP_PATH, {
      params: {
        query: `(language:kuery,query:'_id: ${alertId}')`,
      },
    });
    // Charts render before list-index init finishes. Until that init completes,
    // the alerts table returns null, so the grid is absent even when the
    // summary already shows the alert. Refresh until the grid mounts.
    await this.tableSection.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
    await this.tableSection.scrollIntoViewIfNeeded();
    await expect
      .poll(
        async () => {
          if (await this.alertsTable.isVisible()) {
            return true;
          }
          if (await this.refreshQuery.isEnabled()) {
            await this.refreshQuery.click();
          }
          await this.tableSection.scrollIntoViewIfNeeded();
          return false;
        },
        { timeout: APP_LOAD_TIMEOUT_MS, intervals: [2_000] }
      )
      .toBe(true);
    await this.expandEvent.click();
    await this.flyoutTitle.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }

  async openResponseDetails(): Promise<void> {
    await this.responseSection.waitFor({ state: 'visible' });
    if (!(await this.responseButton.isVisible())) {
      await this.responseSectionHeader.click();
      await this.responseButton.waitFor({ state: 'visible' });
    }
    await this.responseButton.click();
    await this.responseDetails.waitFor({ state: 'visible' });
  }
}
