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
  readonly responseSectionHeader: Locator;
  readonly responseButton: Locator;
  readonly responseDetails: Locator;
  readonly tableSection: Locator;

  constructor(private readonly page: ScoutPage) {
    this.tableSection = this.page.testSubj.locator('alerts-page-table-section');
    this.alertsTable = this.page.testSubj.locator('alertsTableIsLoaded');
    this.expandEvent = this.alertsTable.getByTestId('expand-event');
    this.flyoutTitle = this.page.testSubj.locator('securitySolutionFlyoutAlertTitleText');
    // ExpandableSection never renders the section id itself. It only renders
    // the header and content suffixes.
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
    // summary already shows the alert. Action checks such as isEnabled() use
    // the default 10s timeout and throw out of the poll, so only visibility is checked.
    await expect
      .poll(
        async () => {
          await this.tableSection.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => undefined);
          return this.alertsTable.isVisible();
        },
        { timeout: APP_LOAD_TIMEOUT_MS, intervals: [1_000] }
      )
      .toBe(true);
    await this.expandEvent.click({ timeout: APP_LOAD_TIMEOUT_MS });
    await this.flyoutTitle.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }

  async openResponseDetails(): Promise<void> {
    await this.responseSectionHeader.waitFor({
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT_MS,
    });
    await this.responseSectionHeader.scrollIntoViewIfNeeded({ timeout: APP_LOAD_TIMEOUT_MS });
    // The section is collapsed by default, so the Response button is not mounted yet.
    if (!(await this.responseButton.isVisible())) {
      await this.responseSectionHeader.click({ timeout: APP_LOAD_TIMEOUT_MS });
      await this.responseButton.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
    }
    await this.responseButton.click({ timeout: APP_LOAD_TIMEOUT_MS });
    await this.responseDetails.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }
}
