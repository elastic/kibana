/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { OPEN_HOST_FLYOUT_BUTTON, OPEN_USER_FLYOUT_BUTTON } from '../../common/constants';

/**
 * Common Security Solution page object for shared UI patterns.
 * Extends functionality from @kbn/scout-security page objects.
 */
export class SecurityCommonPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigate to Security Solution alerts page.
   */
  async navigateToAlerts(): Promise<void> {
    await this.page.gotoApp('security/alerts');
  }

  /**
   * Wait for alerts table to load and have at least one alert.
   */
  async waitForAlertsToPopulate(alertCountThreshold = 1): Promise<void> {
    const wrapper = this.page.testSubj.locator('alerts-by-rule-table');
    await wrapper.waitFor({ state: 'visible', timeout: 20_000 });

    const alertsTable = this.page.testSubj.locator('alertsTableIsLoaded');
    await alertsTable.waitFor({ state: 'visible', timeout: 30_000 });

    // Wait for host button (indicates at least one alert row loaded)
    const hostButton = this.page.testSubj.locator(OPEN_HOST_FLYOUT_BUTTON);
    await hostButton.first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Expand the first alert's host entity flyout (click host name).
   */
  async expandFirstAlertHostFlyout(): Promise<void> {
    const hostButton = this.page.testSubj.locator(OPEN_HOST_FLYOUT_BUTTON).first();
    await hostButton.click({ force: true });
  }

  /**
   * Expand the first alert's user entity flyout (click user name).
   */
  async expandFirstAlertUserFlyout(): Promise<void> {
    const userButton = this.page.testSubj.locator(OPEN_USER_FLYOUT_BUTTON).first();
    await userButton.click();
  }

  /**
   * Get locator for test subject.
   */
  testSubj(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj);
  }

  /**
   * Click the misconfiguration accordion title in the flyout.
   */
  async clickMisconfigurationTitle(): Promise<void> {
    const title = this.page.testSubj.locator(
      'securitySolutionFlyoutInsightsMisconfigurationsTitleLink'
    );
    await title.click();
  }
}
