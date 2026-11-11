/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the flyout_v2 host entity flyout, opened via `services.overlays.openSystemFlyout`
 * from a `host.name` value (e.g. the alerts table host-details cell or the document flyout entities
 * section).
 *
 * Covers the host flyout entry point and its alerts insight tool.
 */
export class HostFlyout {
  /** Header container. */
  public readonly header: Locator;
  /** Title text (the host name). Scoped to the header to disambiguate from a parent document flyout. */
  public readonly title: Locator;
  /** Link that opens the Alerts insight tool. */
  public readonly alertsInsightLink: Locator;
  /** Root of the stacked Alerts insight tool flyout. */
  public readonly alertsInsightsTool: Locator;
  /** Alerts table rendered inside the Alerts insight tool. */
  public readonly alertsInsightsToolTable: Locator;
  constructor(page: ScoutPage) {
    this.header = page.testSubj.locator('host-panel-header');
    this.title = this.header.locator('[data-test-subj="flyoutTitleText"]');
    this.alertsInsightLink = page.testSubj.locator('securitySolutionFlyoutInsightsAlertsTitleLink');
    this.alertsInsightsTool = page.testSubj.locator('alertsInsightsTool');
    this.alertsInsightsToolTable = page.testSubj.locator(
      'securitySolutionFlyoutAlertsFindingsTable'
    );
  }

  /** Wait for the host flyout to be visible and its header rendered. */
  async waitForHostFlyout() {
    await this.header.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Open the Alerts insight tool from the entity-insight section. */
  async openAlertsInsightTool() {
    await this.alertsInsightLink.click();
    await this.alertsInsightsTool.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Expand the alert row identified by its rule name. */
  alertsInsightsToolExpandRow(ruleName: string): Locator {
    return this.alertsInsightsToolTable
      .getByRole('row')
      .filter({ hasText: ruleName })
      .getByTestId('securitySolutionFlyoutAlertsFindingsTableExpandButton');
  }
}
