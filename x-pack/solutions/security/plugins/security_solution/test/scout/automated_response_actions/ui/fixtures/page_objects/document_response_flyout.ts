/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Alert table + flyout_v2 Response section / tools overlay.
 */
export class DocumentResponseFlyout {
  public readonly alertsTable: Locator;
  public readonly expandAlertButton: Locator;
  public readonly flyoutTitle: Locator;
  public readonly responseSectionHeader: Locator;
  public readonly responseButton: Locator;
  public readonly responseDetails: Locator;
  public readonly responseActionsView: Locator;

  constructor(private readonly page: ScoutPage) {
    this.alertsTable = this.page.testSubj.locator('alertsTableIsLoaded');
    this.expandAlertButton = this.alertsTable.getByTestId('expand-event');
    this.flyoutTitle = this.page.testSubj.locator('securitySolutionFlyoutAlertTitleText');
    this.responseSectionHeader = this.page.testSubj.locator(
      'securitySolutionFlyoutResponseSectionHeader'
    );
    this.responseButton = this.page.testSubj.locator('securitySolutionFlyoutResponseButton');
    this.responseDetails = this.page.testSubj.locator('securitySolutionFlyoutResponseDetails');
    this.responseActionsView = this.page.testSubj.locator('responseActionsViewWrapper');
  }

  async openForAlertId(alertId: string): Promise<void> {
    await this.page.gotoApp('security/alerts', {
      params: { query: `(language:kuery,query:'_id: ${alertId}')` },
    });
    await this.alertsTable.waitFor({ state: 'visible' });
    await this.expandAlertButton.waitFor({ state: 'visible' });
    await this.expandAlertButton.click();
    await this.flyoutTitle.waitFor({ state: 'visible' });
  }

  async openResponseDetails(): Promise<void> {
    if (!(await this.responseButton.isVisible())) {
      await this.responseSectionHeader.click();
      await this.responseButton.waitFor({ state: 'visible' });
    }
    await this.responseButton.click();
    await this.responseDetails.waitFor({ state: 'visible' });
  }
}
