/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the flyout_v2 user entity flyout, opened via `services.overlays.openSystemFlyout`
 * from a `user.name` value (e.g. the alerts table user-details cell or the document flyout entities
 * section).
 *
 * Covers sections that render for any user (header, observed data, footer actions, alerts insight
 * tool) as well as entity-store-backed sections (risk summary → risk inputs tool). Tests that
 * require the entity store seed it per-space via `apiServices.entityAnalytics.installEntityStoreV2`.
 */
export class UserFlyout {
  /** Header container. */
  public readonly header: Locator;
  /** Title text (the user name). Scoped to the header to disambiguate from a parent document flyout. */
  public readonly title: Locator;
  /** First/last seen timestamp (only rendered when the user is not in the entity store). */
  public readonly lastSeen: Locator;
  /** "User" entity-type badge. */
  public readonly entityTypeBadge: Locator;
  /** Entity source badge (observed vs entity store). */
  public readonly observedBadge: Locator;
  /** Observed-data accordion. */
  public readonly observedAccordion: Locator;
  /** Take action button in the footer. */
  public readonly takeActionButton: Locator;
  /** Link that opens the Alerts insight tool. */
  public readonly alertsInsightLink: Locator;
  /** Root of the stacked Alerts insight tool flyout. */
  public readonly alertsInsightsTool: Locator;
  /** Alerts table rendered inside the Alerts insight tool. */
  public readonly alertsInsightsToolTable: Locator;
  /**
   * Severity badges inside the Alerts insight tool table — one per alert row. Scoped to the tool so
   * it never matches the entity-insight preview behind it, and only present for real alert rows (the
   * empty state renders no badge), making it a meaningful "an alert is listed" assertion.
   */
  public readonly alertsInsightsToolAlertSeverities: Locator;
  /**
   * Source-context title button in the tool header. For the alerts insight tool it shows the user
   * name + storage icon and opens the user flyout when clicked.
   */
  public readonly toolsFlyoutTitle: Locator;
  /** Button that opens the Risk Inputs tool (in the entity risk summary section). */
  public readonly riskInputsLink: Locator;
  /** Root of the stacked Risk Inputs tool flyout body. */
  public readonly riskInputsTool: Locator;

  constructor(page: ScoutPage) {
    this.header = page.testSubj.locator('user-panel-header');
    this.title = this.header.locator('[data-test-subj="flyoutTitleText"]');
    this.lastSeen = page.testSubj.locator('user-panel-header-lastSeen');
    this.entityTypeBadge = page.testSubj.locator('user-panel-header-entity-type-badge');
    this.observedBadge = page.testSubj.locator('user-panel-header-observed-badge');
    this.observedAccordion = page.testSubj.locator('observedEntity-accordion');
    this.takeActionButton = page.testSubj.locator('take-action-button');
    this.alertsInsightLink = page.testSubj.locator('securitySolutionFlyoutInsightsAlertsTitleLink');
    this.alertsInsightsTool = page.testSubj.locator('alertsInsightsTool');
    this.alertsInsightsToolTable = page.testSubj.locator(
      'securitySolutionFlyoutAlertsFindingsTable'
    );
    this.alertsInsightsToolAlertSeverities = this.alertsInsightsTool.locator(
      '[data-test-subj="severityPropertyValue"]'
    );
    this.toolsFlyoutTitle = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeaderTitle');
    this.riskInputsLink = page.testSubj.locator('entityRiskInputsTitleLink');
    this.riskInputsTool = page.testSubj.locator('securitySolutionFlyoutRiskInputsTool');
  }

  /** Wait for the user flyout to be visible and its header rendered. */
  async waitForUserFlyout() {
    await this.header.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Open the Alerts insight tool from the entity-insight section. */
  async openAlertsInsightTool() {
    await this.alertsInsightLink.click();
    await this.alertsInsightsTool.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Open the Risk Inputs tool from the entity risk summary section (requires entity in entity store). */
  async openRiskInputsTool() {
    await this.riskInputsLink.click();
    await this.riskInputsTool.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Distribution-bar segment for a given severity inside the Alerts insight tool. Clicking it filters
   * the alerts table to that severity. The bar is rendered without a data-test-subj, so its segments
   * fall back to a `*__part` suffix; scope to the tool and filter by the (capitalized) severity label.
   */
  alertsInsightsToolSeveritySegment(severityLabel: string): Locator {
    return this.alertsInsightsTool
      .locator('[data-test-subj$="__part"]')
      .filter({ hasText: severityLabel });
  }

  /** Expand the alert row identified by its rule name. */
  alertsInsightsToolExpandRow(ruleName: string): Locator {
    return this.alertsInsightsToolTable
      .getByRole('row')
      .filter({ hasText: ruleName })
      .getByTestId('securitySolutionFlyoutAlertsFindingsTableExpandButton');
  }
}
