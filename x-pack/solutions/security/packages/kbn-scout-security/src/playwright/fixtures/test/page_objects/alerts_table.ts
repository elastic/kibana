/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '@kbn/scout';
import { TIMEOUTS } from '../../../constants/timeouts';

const PAGE_URL = 'security/alerts';

/**
 * Page Object for the Alerts Table page in Kibana Security Solution
 *
 * This page displays security alerts and allows users to view, filter, and take actions on alerts.
 */
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

  // ========================================
  // Additional Locators
  // ========================================

  public get expandAlertButton() {
    return this.page.testSubj.locator('expand-event');
  }

  public get alertsCount() {
    return this.page.testSubj.locator('toolbar-alerts-count');
  }

  public get alertCheckbox() {
    return this.page.locator('[data-test-subj="bulk-actions-row-cell"].euiCheckbox__input');
  }

  public get emptyAlertTable() {
    return this.page.testSubj.locator('alertsTableEmptyState');
  }

  public get closeFlyoutButton() {
    return this.page.testSubj.locator('euiFlyoutCloseButton');
  }

  // ========================================
  // Navigation
  // ========================================

  /**
   * Navigates to the Alerts page
   */
  async navigate() {
    await this.page.gotoApp(PAGE_URL);
    await this.page.waitForURL('**/app/security/alerts**');
  }

  /**
   * Navigates to the Alerts page and dismisses the onboarding modal if present
   */
  async navigateAndDismissOnboarding() {
    await this.navigate();
    await this.dismissOnboardingModal();
  }

  /**
   * Dismisses the onboarding modal if present
   * This modal may appear for first-time users
   */
  async dismissOnboardingModal() {
    await this.page
      .getByRole('button', { name: 'Close tour' })
      .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
      .catch(() => {
        // Modal not present, continue silently
      });
  }

  // ========================================
  // Alert Interaction
  // ========================================

  /**
   * Expands the alert details flyout for a specific alert by rule name
   * @param ruleName - The name of the rule that triggered the alert
   */
  async expandAlertDetailsFlyout(ruleName: string) {
    await this.alertsTable.waitFor({ state: 'visible' });
    // Filter alert by unique rule name
    // Use .first() to handle cases where multiple alerts have the same rule name
    // eslint-disable-next-line playwright/no-nth-methods
    const row = this.alertRow.filter({ hasText: ruleName }).first();
    await expect(
      row,
      `Alert with rule '${ruleName}' is not displayed in the alerts table`
    ).toBeVisible();

    return row.locator(`[data-test-subj='expand-event']`).click();
  }

  /**
   * Expands the first alert in the table
   * Useful when you don't know the rule name or just need any alert
   */
  async expandFirstAlert() {
    await this.alertsTable.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    // eslint-disable-next-line playwright/no-nth-methods
    const firstExpandButton = this.expandAlertButton.first();
    await firstExpandButton.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await firstExpandButton.click();
  }

  /**
   * Closes the alert details flyout
   */
  async closeAlertFlyout() {
    await this.closeFlyoutButton.click();
  }

  // ========================================
  // Wait & Loading Methods
  // ========================================

  /**
   * Waits for the detections alerts wrapper to load
   * @param ruleName - Optional rule name to wait for
   */
  async waitForDetectionsAlertsWrapper(ruleName?: string) {
    // Wait for the alerts-by-rule table to be visible
    await this.detectionsAlertsWrapper.waitFor({ state: 'visible', timeout: 20_000 });

    // If a specific rule name is provided, wait for it to appear in the table
    if (ruleName) {
      // First ensure alerts exist - wait for empty state to disappear or alert rows to appear
      // This ensures we don't try to find a rule name in an empty table
      try {
        const emptyState = this.emptyAlertTable;
        const isEmptyVisible = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);

        if (isEmptyVisible) {
          // Wait for alerts to appear by checking that empty state disappears
          await expect(emptyState).not.toBeVisible({ timeout: 20_000 });
        }
      } catch {
        // Empty state check failed or not found, continue to check for rule name
      }

      // Now wait for the rule name to appear in the alerts-by-rule table
      await this.detectionsAlertsWrapper
        .getByText(ruleName)
        .waitFor({ state: 'visible', timeout: 20_000 });
    }
  }

  /**
   * Waits for the alerts table to finish loading
   */
  async waitForAlertsToLoad() {
    await this.alertsTable.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG });
  }

  // ========================================
  // Alert Count & Filtering
  // ========================================

  /**
   * Gets the total number of alerts displayed in the count badge
   * @returns The number of alerts
   */
  async getAlertCount(): Promise<number> {
    const text = await this.alertsCount.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Gets the number of visible alert rows in the table
   * @returns The number of visible rows
   */
  async getVisibleAlertRows(): Promise<number> {
    return this.alertRow.count();
  }

  // ========================================
  // Assertion Methods
  // ========================================

  /**
   * Asserts that the alerts table is visible and loaded
   */
  async expectAlertsTableLoaded() {
    await expect(this.alertsTable).toBeVisible();
  }

  /**
   * Asserts that a specific number of alerts are displayed
   * @param expectedCount - The expected number of alerts
   */
  async expectAlertCount(expectedCount: number) {
    await expect(this.alertsCount).toContainText(`${expectedCount}`);
  }

  /**
   * Asserts that the empty state is visible (no alerts)
   */
  async expectEmptyState() {
    await expect(this.emptyAlertTable).toBeVisible();
  }

  /**
   * Asserts that an alert with the given rule name is visible
   * @param ruleName - The rule name to check for
   */
  async expectAlertWithRuleVisible(ruleName: string) {
    const row = this.alertRow.filter({ hasText: ruleName });
    await expect(row).toBeVisible();
  }
}
