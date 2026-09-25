/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';

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

  constructor(private readonly page: ScoutPage) {
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
    // First visit creates the ad-hoc alerts data view. The table stays on its
    // skeleton until that finishes, which is past the default 10s action timeout.
    await this.alertsTable.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
    await this.expandEvent.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
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
