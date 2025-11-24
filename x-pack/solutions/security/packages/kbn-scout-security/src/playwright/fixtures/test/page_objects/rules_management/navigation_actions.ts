/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { TIMEOUTS } from '../../../../constants/timeouts';
import type { RulesManagementLocators } from './rules_management_locators';

/**
 * Actions related to Rules Management page navigation
 *
 * This class handles navigation to the page, tab switching, and onboarding dismissal.
 */
export class NavigationActions {
  constructor(
    private readonly page: ScoutPage,
    private readonly locators: RulesManagementLocators
  ) {}

  /**
   * Navigates to the Rules Management page
   */
  async navigate() {
    await this.page.gotoApp('security', { path: '/rules/management' });
    await this.page.waitForURL('**/app/security/rules/management**');
  }

  /**
   * Navigates to the Rules Management page and dismisses the onboarding tour if present
   */
  async navigateAndDismissOnboarding() {
    await this.navigate();
    await this.dismissOnboardingTour();
  }

  /**
   * Dismisses the onboarding tour modal if present
   * This modal may appear for first-time users
   */
  async dismissOnboardingTour() {
    await this.page
      .getByRole('button', { name: 'Close tour' })
      .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
      .catch(() => {
        // Modal not present, continue silently
      });
  }

  /**
   * Switches to the Management tab
   */
  async goToManagementTab() {
    await this.locators.managementTab.click();
    await this.locators.rulesManagementTable.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the Monitoring tab
   */
  async goToMonitoringTab() {
    await this.locators.monitoringTab.click();
    await this.locators.rulesMonitoringTable.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the Updates tab
   */
  async goToUpdatesTab() {
    await this.locators.updatesTab.click();
    await this.locators.rulesUpdatesTable.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }
}
